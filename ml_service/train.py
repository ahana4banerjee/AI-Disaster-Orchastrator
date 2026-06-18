import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from pymongo import MongoClient
from lightgbm import LGBMClassifier
from sklearn.metrics import classification_report, f1_score, accuracy_score

# Setup paths to import ml_service modules
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(base_dir, "ml_service"))

from src.preprocessing import DisasterPreprocessor, SeverityLabelGenerator
from src.split_strategy import TimeSeriesDataSplitter

def load_env_mongo_uri():
    """
    Read MONGO_URI from the root .env file.
    """
    env_path = os.path.join(base_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if stripped.startswith("MONGO_URI="):
                    val = stripped.split("=", 1)[1].strip()
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    return val
    return os.getenv("MONGO_URI")

def fetch_data_from_mongodb():
    mongo_uri = load_env_mongo_uri()
    if not mongo_uri:
        print("Error: MONGO_URI not found in environment or .env file.")
        sys.exit(1)

    print("Connecting to MongoDB...")
    client = MongoClient(mongo_uri)
    db = client.get_default_database(default="disaster_db")
    
    print("Fetching disaster records...")
    records = list(db.disaster_records.find({}))
    print(f"Successfully loaded {len(records)} records.")
    
    # Flatten records for DataFrame conversion
    flat_records = []
    for r in records:
        flat = {
            "disNo": r.get("disNo"),
            "startDate": r.get("startDate"),
            "disasterGroup": r.get("disasterGroup"),
            "disasterSubgroup": r.get("disasterSubgroup"),
            "disasterType": r.get("disasterType"),
            "disasterSubtype": r.get("disasterSubtype"),
            "country": r.get("country"),
            "iso": r.get("iso"),
            "region": r.get("region"),
            "subregion": r.get("subregion"),
            "magnitude": r.get("magnitude"),
            "severityScore": r.get("severityScore"),
            "severityClass": r.get("severityClass")
        }
        flat_records.append(flat)
        
    return pd.DataFrame(flat_records)

def main():
    df = fetch_data_from_mongodb()
    
    # Verify we have enough data
    if len(df) < 100:
        print(f"Error: Too few records in database ({len(df)}). Please run ingestion script first.")
        sys.exit(1)
        
    print("\n--- Splitting Data Chronologically ---")
    splitter = TimeSeriesDataSplitter(date_col='startDate')
    train_df, test_df = splitter.train_test_split(df, test_size=0.2)
    print(f"Train records: {len(train_df)} (from {train_df['startDate'].min().date()} to {train_df['startDate'].max().date()})")
    print(f"Test records: {len(test_df)} (from {test_df['startDate'].min().date()} to {test_df['startDate'].max().date()})")

    # Features and targets
    X_train_raw = train_df[['startDate', 'disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion', 'magnitude', 'severityScore']]
    X_test_raw = test_df[['startDate', 'disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion', 'magnitude', 'severityScore']]
    
    y_train_score = train_df['severityScore']
    y_test_score = test_df['severityScore']

    print("\n--- Time-Series Cross-Validation on Train Set ---")
    cv_splits = list(splitter.get_cv_splits(train_df, n_splits=5))
    cv_scores = []
    
    for fold, (fold_train, fold_val) in enumerate(cv_splits, 1):
        # Prepare fold datasets
        X_fold_train = fold_train[['startDate', 'disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion', 'magnitude', 'severityScore']]
        X_fold_val = fold_val[['startDate', 'disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion', 'magnitude', 'severityScore']]
        
        y_fold_train_score = fold_train['severityScore']
        y_fold_val_score = fold_val['severityScore']
        
        # Fit preprocessor on fold train
        fold_preprocessor = DisasterPreprocessor()
        X_fold_train_trans = fold_preprocessor.fit_transform(X_fold_train, y_fold_train_score)
        X_fold_val_trans = fold_preprocessor.transform(X_fold_val)
        
        # Fit label generator on fold train
        fold_label_gen = SeverityLabelGenerator(encode_as_int=True)
        y_fold_train_class = fold_label_gen.fit_transform(y_fold_train_score)
        y_fold_val_class = fold_label_gen.transform(y_fold_val_score)
        
        # Train fold classifier
        fold_clf = LGBMClassifier(
            objective='multiclass',
            num_class=4,
            class_weight='balanced',
            random_state=42,
            n_estimators=100,
            verbose=-1
        )
        fold_clf.fit(X_fold_train_trans, y_fold_train_class)
        
        # Evaluate fold classifier
        fold_preds = fold_clf.predict(X_fold_val_trans)
        fold_f1 = f1_score(y_fold_val_class, fold_preds, average='macro')
        fold_acc = accuracy_score(y_fold_val_class, fold_preds)
        
        print(f"Fold {fold} - Train Size: {len(X_fold_train_trans)}, Val Size: {len(X_fold_val_trans)} -> Val F1-Macro: {fold_f1:.4f}, Val Acc: {fold_acc:.4f}")
        cv_scores.append(fold_f1)
        
    print(f"Mean Time-Series CV F1-Macro: {np.mean(cv_scores):.4f}")

    print("\n--- Training Final Severity Model on Full Train Set ---")
    # Fit preprocessor and label generator on full train set
    preprocessor = DisasterPreprocessor()
    X_train_trans = preprocessor.fit_transform(X_train_raw, y_train_score)
    X_test_trans = preprocessor.transform(X_test_raw)
    
    label_gen = SeverityLabelGenerator(encode_as_int=True)
    y_train_class = label_gen.fit_transform(y_train_score)
    y_test_class = label_gen.transform(y_test_score)
    
    # Train final classifier
    clf = LGBMClassifier(
        objective='multiclass',
        num_class=4,
        class_weight='balanced',
        random_state=42,
        n_estimators=150,
        verbose=-1
    )
    clf.fit(X_train_trans, y_train_class)
    
    # Evaluate on test set
    preds = clf.predict(X_test_trans)
    test_f1_macro = f1_score(y_test_class, preds, average='macro')
    test_f1_weighted = f1_score(y_test_class, preds, average='weighted')
    test_acc = accuracy_score(y_test_class, preds)
    
    print("\n--- Test Set Evaluation ---")
    print(f"Accuracy: {test_acc:.4f}")
    print(f"F1-Macro Score: {test_f1_macro:.4f}")
    print(f"F1-Weighted Score: {test_f1_weighted:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test_class, preds, target_names=label_gen.class_names))

    # Serialize artifacts to model registry
    registry_dir = os.path.join(base_dir, "ml_service", "models", "registry")
    os.makedirs(registry_dir, exist_ok=True)
    
    clf_path = os.path.join(registry_dir, "severity_classifier.joblib")
    prep_path = os.path.join(registry_dir, "preprocessor.joblib")
    lbl_path = os.path.join(registry_dir, "severity_label_generator.joblib")
    
    joblib.dump(clf, clf_path)
    joblib.dump(preprocessor, prep_path)
    joblib.dump(label_gen, lbl_path)
    
    print(f"\nModel registry updated successfully:")
    print(f"  - Severity Classifier: {clf_path}")
    print(f"  - Preprocessor: {prep_path}")
    print(f"  - Severity Label Generator: {lbl_path}")

if __name__ == "__main__":
    main()
