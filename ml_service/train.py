import os
import sys
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from pymongo import MongoClient
from lightgbm import LGBMClassifier
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
    
    y_train_score = train_df['severityScore'].values
    y_test_score = test_df['severityScore'].values

    # Setup directories
    registry_dir = os.path.join(base_dir, "ml_service", "models", "registry")
    os.makedirs(registry_dir, exist_ok=True)

    # =========================================================================
    # MODEL 1: BASELINE LIGHTGBM CLASSIFIER (ORIGINAL PLAN)
    # =========================================================================
    print("\n=========================================================================")
    print("TRAINING MODEL 1: BASELINE LIGHTGBM MULTICLASS CLASSIFIER")
    print("=========================================================================")
    
    # Fits standard preprocessor (no kfold, no duration, no coordinates)
    preprocessor_lgb = DisasterPreprocessor(kfold=False, include_duration=False, include_coordinates=False)
    X_train_trans_lgb = preprocessor_lgb.fit_transform(X_train_raw, y_train_score)
    X_test_trans_lgb = preprocessor_lgb.transform(X_test_raw)
    
    # Static label generator fit on ground truth train severity scores
    label_gen_lgb = SeverityLabelGenerator(encode_as_int=True)
    label_gen_lgb.fit(y_train_score)
    y_train_class_lgb = label_gen_lgb.transform(y_train_score)
    y_test_class_lgb = label_gen_lgb.transform(y_test_score)
    
    clf_lgb = LGBMClassifier(
        objective='multiclass',
        num_class=4,
        class_weight='balanced',
        learning_rate=0.03,
        n_estimators=150,
        random_state=42,
        verbose=-1
    )
    clf_lgb.fit(X_train_trans_lgb, y_train_class_lgb)
    
    preds_lgb = clf_lgb.predict(X_test_trans_lgb)
    test_f1_lgb = f1_score(y_test_class_lgb, preds_lgb, average='macro')
    test_acc_lgb = accuracy_score(y_test_class_lgb, preds_lgb)
    
    print("\n--- Baseline LightGBM Test Evaluation ---")
    print(f"Accuracy: {test_acc_lgb:.4f}")
    print(f"F1-Macro Score: {test_f1_lgb:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test_class_lgb, preds_lgb, target_names=label_gen_lgb.class_names))
    
    # Save baseline artifacts
    joblib.dump(clf_lgb, os.path.join(registry_dir, "severity_classifier_baseline.joblib"))
    joblib.dump(preprocessor_lgb, os.path.join(registry_dir, "preprocessor_baseline.joblib"))
    joblib.dump(label_gen_lgb, os.path.join(registry_dir, "severity_label_generator_baseline.joblib"))

    # =========================================================================
    # MODEL 2: PRODUCTION DERIVED SEVERITY PIPELINE (OPTIMIZED PLAN)
    # =========================================================================
    print("\n=========================================================================")
    print("TRAINING MODEL 2: PRODUCTION DERIVED SEVERITY PIPELINE (CATBOOST REGRESSORS)")
    print("=========================================================================")
    
    # Log-transformed regression targets
    y_train_deaths = np.log10(train_df['deaths'].values + 1)
    y_train_affected = np.log10(train_df['affected'].values + 1)
    y_train_damage = np.log10(train_df['damage'].values / 1000.0 + 1)
    
    y_test_deaths = np.log10(test_df['deaths'].values + 1)
    y_test_affected = np.log10(test_df['affected'].values + 1)
    y_test_damage = np.log10(test_df['damage'].values / 1000.0 + 1)
    
    # Fits preprocessor with out-of-fold target encoding, duration, and coordinate extraction
    preprocessor = DisasterPreprocessor(kfold=True, include_duration=True, include_coordinates=True)
    X_train_trans = preprocessor.fit_transform(X_train_raw, y_train_score)
    X_test_trans = preprocessor.transform(X_test_raw)
    
    reg_deaths = CatBoostRegressor(learning_rate=0.03, iterations=300, random_seed=42, verbose=0)
    reg_affected = CatBoostRegressor(learning_rate=0.03, iterations=300, random_seed=42, verbose=0)
    reg_damage = CatBoostRegressor(learning_rate=0.03, iterations=300, random_seed=42, verbose=0)
    
    print("Fitting CatBoost Regressors...")
    reg_deaths.fit(X_train_trans, y_train_deaths)
    reg_affected.fit(X_train_trans, y_train_affected)
    reg_damage.fit(X_train_trans, y_train_damage)
    
    # Predict on train set to compute dynamic threshold boundaries
    train_pred_deaths = reg_deaths.predict(X_train_trans)
    train_pred_affected = reg_affected.predict(X_train_trans)
    train_pred_damage = reg_damage.predict(X_train_trans)
    derived_train_scores = 0.4 * train_pred_deaths + 0.3 * train_pred_affected + 0.3 * train_pred_damage
    
    label_gen = SeverityLabelGenerator(encode_as_int=True)
    label_gen.fit(derived_train_scores)
    
    # Instantiate derived classifier wrapper
    clf = DerivedSeverityClassifier(reg_deaths, reg_affected, reg_damage, label_gen)
    
    # Evaluate derived pipeline on test set
    preds = clf.predict(X_test_trans)
    test_f1 = f1_score(y_test_class_lgb, preds, average='macro')
    test_acc = accuracy_score(y_test_class_lgb, preds)
    
    print("\n--- Production Derived Pipeline Test Evaluation ---")
    print(f"Accuracy: {test_acc:.4f}")
    print(f"F1-Macro Score: {test_f1:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test_class_lgb, preds, target_names=label_gen_lgb.class_names))
    
    # Print confusion matrix
    cm = confusion_matrix(y_test_class_lgb, preds)
    print("Confusion Matrix:")
    print(cm)
    
    # Save production artifacts
    joblib.dump(clf, os.path.join(registry_dir, "severity_classifier.joblib"))
    joblib.dump(preprocessor, os.path.join(registry_dir, "preprocessor.joblib"))
    joblib.dump(label_gen, os.path.join(registry_dir, "severity_label_generator.joblib"))
    
    print(f"\nModel registry updated successfully:")
    print(f"  - Severity Classifier (Production): {os.path.join(registry_dir, 'severity_classifier.joblib')}")
    print(f"  - Preprocessor (Production): {os.path.join(registry_dir, 'preprocessor.joblib')}")
    print(f"  - Severity Label Generator (Production): {os.path.join(registry_dir, 'severity_label_generator.joblib')}")

if __name__ == "__main__":
    main()
