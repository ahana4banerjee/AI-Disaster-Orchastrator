import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime
from pymongo import MongoClient
from lightgbm import LGBMClassifier
from sklearn.metrics import classification_report, f1_score, accuracy_score
from sklearn.preprocessing import OrdinalEncoder

# Setup paths to import ml_service modules
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(base_dir, "ml_service"))

from src.preprocessing import DisasterPreprocessor, SeverityLabelGenerator
from src.split_strategy import TimeSeriesDataSplitter

def load_env_mongo_uri():
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

def fetch_data():
    mongo_uri = load_env_mongo_uri()
    client = MongoClient(mongo_uri)
    db = client.get_default_database(default="disaster_db")
    records = list(db.disaster_records.find({}))
    flat_records = []
    for r in records:
        flat = {
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

def run_experiment():
    df = fetch_data()
    splitter = TimeSeriesDataSplitter(date_col='startDate')
    train_df, test_df = splitter.train_test_split(df, test_size=0.2)
    
    # Target variables
    y_train_score = train_df['severityScore']
    y_test_score = test_df['severityScore']
    
    label_gen = SeverityLabelGenerator(encode_as_int=True)
    y_train = label_gen.fit_transform(y_train_score)
    y_test = label_gen.transform(y_test_score)
    
    # ------------------ EXPERIMENT 1: Native Categorical Features ------------------
    print("\n=== Experiment 1: LightGBM Native Categorical Features + Basic Numeric ===")
    
    # Prepare features
    cat_cols = ['disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion']
    
    X_train = pd.DataFrame()
    X_test = pd.DataFrame()
    
    # Extract month and year
    train_dates = pd.to_datetime(train_df['startDate'])
    test_dates = pd.to_datetime(test_df['startDate'])
    
    X_train['year'] = train_dates.dt.year.fillna(2000)
    X_train['month'] = train_dates.dt.month.fillna(6)
    X_test['year'] = test_dates.dt.year.fillna(2000)
    X_test['month'] = test_dates.dt.month.fillna(6)
    
    # Magnitude
    X_train['magnitude'] = pd.to_numeric(train_df['magnitude'], errors='coerce')
    X_test['magnitude'] = pd.to_numeric(test_df['magnitude'], errors='coerce')
    X_train['magnitude_is_missing'] = X_train['magnitude'].isnull().astype(int)
    X_test['magnitude_is_missing'] = X_test['magnitude'].isnull().astype(int)
    
    # Fill magnitude nans
    X_train['magnitude'] = X_train['magnitude'].fillna(0.0)
    X_test['magnitude'] = X_test['magnitude'].fillna(0.0)
    
    # Categoricals - using OrdinalEncoder and casting to category
    encoder = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
    
    train_cats = train_df[cat_cols].fillna("MISSING")
    test_cats = test_df[cat_cols].fillna("MISSING")
    
    X_train_cats = pd.DataFrame(encoder.fit_transform(train_cats), columns=cat_cols)
    X_test_cats = pd.DataFrame(encoder.transform(test_cats), columns=cat_cols)
    
    # Convert to category dtype
    for col in cat_cols:
        X_train[col] = X_train_cats[col].astype('category')
        X_test[col] = X_test_cats[col].astype('category')
        
    # Fit model
    clf = LGBMClassifier(
        objective='multiclass',
        num_class=4,
        class_weight='balanced',
        random_state=42,
        n_estimators=150,
        verbose=-1
    )
    clf.fit(X_train, y_train)
    
    preds = clf.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, preds):.4f}")
    print(f"F1-Macro: {f1_score(y_test, preds, average='macro'):.4f}")
    print(classification_report(y_test, preds, target_names=label_gen.class_names))
    
    # ------------------ EXPERIMENT 2: Preprocessor features + Tuning ------------------
    print("\n=== Experiment 2: Preprocessed Features (Target Encoding) + LightGBM Tuning ===")
    
    preprocessor = DisasterPreprocessor(categorical_cols=cat_cols, smoothing=5.0)
    X_train_prep = preprocessor.fit_transform(
        train_df[['startDate', 'disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion', 'magnitude', 'severityScore']],
        y_train_score
    )
    X_test_prep = preprocessor.transform(
        test_df[['startDate', 'disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion', 'magnitude', 'severityScore']]
    )
    
    # Let's add Year to preprocessed features
    X_train_prep['year'] = train_dates.dt.year.fillna(2000).values
    X_test_prep['year'] = test_dates.dt.year.fillna(2000).values
    
    X_train_prep['magnitude_is_missing'] = train_df['magnitude'].isnull().astype(int).values
    X_test_prep['magnitude_is_missing'] = test_df['magnitude'].isnull().astype(int).values
    
    # ------------------ EXPERIMENT 3: Regressor-to-Classification ------------------
    print("\n=== Experiment 3: LGBM Regressor -> Classification Thresholding ===")
    
    # Train regressor to predict continuous severityScore
    from lightgbm import LGBMRegressor
    reg = LGBMRegressor(
        learning_rate=0.03,
        num_leaves=31,
        max_depth=6,
        min_child_samples=20,
        random_state=42,
        n_estimators=300,
        verbose=-1
    )
    reg.fit(X_train_prep, y_train_score)
    
    pred_scores = reg.predict(X_test_prep)
    
    # Use SeverityLabelGenerator to map predicted continuous scores to classes
    pred_classes = label_gen.transform(pred_scores)
    
    print(f"Accuracy: {accuracy_score(y_test, pred_classes):.4f}")
    print(f"F1-Macro: {f1_score(y_test, pred_classes, average='macro'):.4f}")
    print(classification_report(y_test, pred_classes, target_names=label_gen.class_names))

if __name__ == "__main__":
    run_experiment()
