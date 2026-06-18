import os
import sys
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from pymongo import MongoClient
from catboost import CatBoostRegressor
from sklearn.metrics import classification_report, f1_score, accuracy_score, confusion_matrix

# Setup paths to import ml_service modules
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(base_dir, "ml_service"))

from src.preprocessing import DisasterPreprocessor, SeverityLabelGenerator, DerivedSeverityClassifier
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
            "endDate": r.get("endDate"),
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
            "severityClass": r.get("severityClass"),
            "deaths": r.get("impact", {}).get("deaths", 0),
            "affected": r.get("impact", {}).get("totalAffected", 0),
            "damage": r.get("impact", {}).get("economicDamageUSD", 0) or 0.0,
            "longitude": r.get("geoJSON", {}).get("coordinates", [None, None])[0],
            "latitude": r.get("geoJSON", {}).get("coordinates", [None, None])[1]
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
    feature_cols = ['startDate', 'endDate', 'disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion', 'magnitude', 'longitude', 'latitude']
    X_train_raw = train_df[feature_cols]
    X_test_raw = test_df[feature_cols]
    
    # Log-transformed regression targets
    y_train_deaths = np.log10(train_df['deaths'].values + 1)
    y_train_affected = np.log10(train_df['affected'].values + 1)
    y_train_damage = np.log10(train_df['damage'].values / 1000.0 + 1)
    
    y_test_deaths = np.log10(test_df['deaths'].values + 1)
    y_test_affected = np.log10(test_df['affected'].values + 1)
    y_test_damage = np.log10(test_df['damage'].values / 1000.0 + 1)
    
    y_train_score = train_df['severityScore'].values
    y_test_score = test_df['severityScore'].values

    # Severity classes
    label_gen_gt = SeverityLabelGenerator(encode_as_int=True)
    label_gen_gt.fit(y_train_score)
    y_train_class = label_gen_gt.transform(y_train_score)
    y_test_class = label_gen_gt.transform(y_test_score)

    print("\n--- Time-Series Cross-Validation on Train Set ---")
    cv_splits = list(splitter.get_cv_splits(train_df, n_splits=5))
    cv_scores = []
    
    for fold, (fold_train, fold_val) in enumerate(cv_splits, 1):
        X_fold_train = fold_train[feature_cols]
        X_fold_val = fold_val[feature_cols]
        
        y_fold_train_score = fold_train['severityScore'].values
        y_fold_val_score = fold_val['severityScore'].values
        
        # Log targets
        y_fold_tr_deaths = np.log10(fold_train['deaths'].values + 1)
        y_fold_tr_affected = np.log10(fold_train['affected'].values + 1)
        y_fold_tr_damage = np.log10(fold_train['damage'].values / 1000.0 + 1)
        
        # Fit preprocessor on fold train (out-of-fold target encoding enabled)
        fold_preprocessor = DisasterPreprocessor(kfold=True, include_duration=True, include_coordinates=True)
        X_fold_train_trans = fold_preprocessor.fit_transform(X_fold_train, y_fold_train_score)
        X_fold_val_trans = fold_preprocessor.transform(X_fold_val)
        
        # Train fold regressors
        f_reg_deaths = CatBoostRegressor(learning_rate=0.03, iterations=200, random_seed=42, verbose=0)
        f_reg_affected = CatBoostRegressor(learning_rate=0.03, iterations=200, random_seed=42, verbose=0)
        f_reg_damage = CatBoostRegressor(learning_rate=0.03, iterations=200, random_seed=42, verbose=0)
        
        f_reg_deaths.fit(X_fold_train_trans, y_fold_tr_deaths)
        f_reg_affected.fit(X_fold_train_trans, y_fold_tr_affected)
        f_reg_damage.fit(X_fold_train_trans, y_fold_tr_damage)
        
        # Predict on fold val and derive severity
        fold_pred_deaths = f_reg_deaths.predict(X_fold_val_trans)
        fold_pred_affected = f_reg_affected.predict(X_fold_val_trans)
        fold_pred_damage = f_reg_damage.predict(X_fold_val_trans)
        derived_fold_val_scores = 0.4 * fold_pred_deaths + 0.3 * fold_pred_affected + 0.3 * fold_pred_damage
        
        # Dynamic threshold generator for fold
        fold_pred_tr_deaths = f_reg_deaths.predict(X_fold_train_trans)
        fold_pred_tr_affected = f_reg_affected.predict(X_fold_train_trans)
        fold_pred_tr_damage = f_reg_damage.predict(X_fold_train_trans)
        derived_fold_tr_scores = 0.4 * fold_pred_tr_deaths + 0.3 * fold_pred_tr_affected + 0.3 * fold_pred_tr_damage
        
        fold_label_gen = SeverityLabelGenerator(encode_as_int=True)
        fold_label_gen.fit(derived_fold_tr_scores)
        
        y_fold_val_class_pred = fold_label_gen.transform(derived_fold_val_scores)
        y_fold_val_class_gt = label_gen_gt.transform(y_fold_val_score)
        
        fold_f1 = f1_score(y_fold_val_class_gt, y_fold_val_class_pred, average='macro')
        fold_acc = accuracy_score(y_fold_val_class_gt, y_fold_val_class_pred)
        
        print(f"Fold {fold} - Train Size: {len(X_fold_train_trans)}, Val Size: {len(X_fold_val_trans)} -> Val F1-Macro: {fold_f1:.4f}, Val Acc: {fold_acc:.4f}")
        cv_scores.append(fold_f1)
        
    print(f"Mean Time-Series CV F1-Macro: {np.mean(cv_scores):.4f}")

    print("\n--- Training Final Severity Model on Full Train Set ---")
    preprocessor = DisasterPreprocessor(kfold=True, include_duration=True, include_coordinates=True)
    X_train_trans = preprocessor.fit_transform(X_train_raw, y_train_score)
    X_test_trans = preprocessor.transform(X_test_raw)
    
    # Train final multi-output regressors
    print("Fitting CatBoost Regressors...")
    reg_deaths = CatBoostRegressor(learning_rate=0.03, iterations=300, random_seed=42, verbose=0)
    reg_affected = CatBoostRegressor(learning_rate=0.03, iterations=300, random_seed=42, verbose=0)
    reg_damage = CatBoostRegressor(learning_rate=0.03, iterations=300, random_seed=42, verbose=0)
    
    reg_deaths.fit(X_train_trans, y_train_deaths)
    reg_affected.fit(X_train_trans, y_train_affected)
    reg_damage.fit(X_train_trans, y_train_damage)
    
    # Predict on train to fit threshold generator
    train_pred_deaths = reg_deaths.predict(X_train_trans)
    train_pred_affected = reg_affected.predict(X_train_trans)
    train_pred_damage = reg_damage.predict(X_train_trans)
    derived_train_scores = 0.4 * train_pred_deaths + 0.3 * train_pred_affected + 0.3 * train_pred_damage
    
    # Fit final dynamic label generator
    label_gen = SeverityLabelGenerator(encode_as_int=True)
    label_gen.fit(derived_train_scores)
    
    # Wrap in DerivedSeverityClassifier
    clf = DerivedSeverityClassifier(reg_deaths, reg_affected, reg_damage, label_gen)
    
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
    print(classification_report(y_test_class, preds, target_names=label_gen_gt.class_names))
    
    # Print confusion matrix
    cm = confusion_matrix(y_test_class, preds)
    print("Confusion Matrix:")
    print(cm)

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
