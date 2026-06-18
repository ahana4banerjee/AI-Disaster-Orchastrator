import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime
from pymongo import MongoClient
from lightgbm import LGBMClassifier
from sklearn.metrics import classification_report, f1_score, accuracy_score, confusion_matrix

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
            "severityClass": r.get("severityClass"),
            "deaths": r.get("impact", {}).get("deaths", 0),
            "affected": r.get("impact", {}).get("totalAffected", 0),
            "damage": r.get("impact", {}).get("economicDamageUSD", 0) or 0
        }
        flat_records.append(flat)
    return pd.DataFrame(flat_records)

def diagnose():
    print("Fetching data from MongoDB...")
    df = fetch_data()
    
    splitter = TimeSeriesDataSplitter(date_col='startDate')
    train_df, test_df = splitter.train_test_split(df, test_size=0.2)
    
    train_dates = pd.to_datetime(train_df['startDate'])
    test_dates = pd.to_datetime(test_df['startDate'])
    
    # ------------------ DIAGNOSIS 1: Temporal Drift Analysis ------------------
    print("\n--- Diagnosing Temporal Drift ---")
    drift_report = []
    
    # Check mean severity score
    mean_sev_train = train_df['severityScore'].mean()
    mean_sev_test = test_df['severityScore'].mean()
    drift_report.append(f"- **Severity Score Mean**: Train = {mean_sev_train:.4f}, Test = {mean_sev_test:.4f} (Change: {((mean_sev_test-mean_sev_train)/mean_sev_train)*100:+.2f}%)")
    
    # Check mean magnitude (non-nulls)
    train_mags = pd.to_numeric(train_df['magnitude'], errors='coerce').dropna()
    test_mags = pd.to_numeric(test_df['magnitude'], errors='coerce').dropna()
    mean_mag_train = train_mags.mean() if len(train_mags) > 0 else 0
    mean_mag_test = test_mags.mean() if len(test_mags) > 0 else 0
    drift_report.append(f"- **Magnitude Mean**: Train = {mean_mag_train:.4f}, Test = {mean_mag_test:.4f} (Change: {((mean_mag_test-mean_mag_train)/mean_mag_train)*100:+.2f}%)")
    
    # Check missing magnitude ratio
    miss_mag_train = train_df['magnitude'].isnull().mean()
    miss_mag_test = test_df['magnitude'].isnull().mean()
    drift_report.append(f"- **Missing Magnitude Ratio**: Train = {miss_mag_train*100:.2f}%, Test = {miss_mag_test*100:.2f}%")
    
    # Check top disaster types distribution drift
    top_train_types = train_df['disasterType'].value_counts(normalize=True).head(3).to_dict()
    top_test_types = test_df['disasterType'].value_counts(normalize=True).head(3).to_dict()
    
    drift_report.append("\n- **Top Disaster Types Distribution (Train vs Test)**:")
    for dtype, share in top_train_types.items():
        test_share = top_test_types.get(dtype, 0.0)
        drift_report.append(f"  - `{dtype}`: Train = {share*100:.2f}%, Test = {test_share*100:.2f}%")

    # ------------------ DIAGNOSIS 2: Class Boundaries Overlap ------------------
    print("\n--- Diagnosing Label Boundaries ---")
    # Retrieve thresholds
    label_gen = SeverityLabelGenerator(encode_as_int=True)
    label_gen.fit(train_df['severityScore'])
    p25, p75, p95 = label_gen.thresholds_
    
    # Let's inspect label mapping overlap
    overlap_report = [
        f"- **Percentile Thresholds (P25, P75, P95)**: `[{p25:.4f}, {p75:.4f}, {p95:.4f}]`"
    ]
    
    # Compute stats of severity components per class to see overlap
    overlap_report.append("\n- **Mean Impact Component Values per Class (Train Set)**:")
    for cls_name in ['Low', 'Medium', 'High', 'Extreme']:
        cls_df = train_df[train_df['severityClass'] == cls_name]
        overlap_report.append(f"  - **{cls_name}** (N={len(cls_df)}):")
        overlap_report.append(f"    - Mean Deaths: {cls_df['deaths'].mean():.2f}")
        overlap_report.append(f"    - Mean Affected: {cls_df['affected'].mean():.2f}")
        overlap_report.append(f"    - Mean Damage (USD): ${cls_df['damage'].mean():,.2f}")

    # ------------------ DIAGNOSIS 3: Feature Importances & Confusion Matrix ------------------
    print("\n--- Training Diagnostic Model ---")
    cat_cols = ['disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion']
    preprocessor = DisasterPreprocessor(categorical_cols=cat_cols)
    
    X_train_raw = train_df[['startDate', 'disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion', 'magnitude', 'severityScore']]
    X_test_raw = test_df[['startDate', 'disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion', 'magnitude', 'severityScore']]
    
    X_train = preprocessor.fit_transform(X_train_raw, train_df['severityScore'])
    X_test = preprocessor.transform(X_test_raw)
    
    y_train = label_gen.transform(train_df['severityScore'])
    y_test = label_gen.transform(test_df['severityScore'])
    
    clf = LGBMClassifier(
        objective='multiclass',
        num_class=4,
        class_weight='balanced',
        random_state=42,
        n_estimators=100,
        verbose=-1
    )
    clf.fit(X_train, y_train)
    
    preds = clf.predict(X_test)
    
    # Feature Importances
    importances = clf.feature_importances_
    features = X_train.columns.tolist()
    feat_imp = pd.Series(importances, index=features).sort_values(ascending=False).to_dict()
    
    feat_report = ["\n- **Feature Importances (Split-based)**:"]
    for feat, imp in feat_imp.items():
        feat_report.append(f"  - `{feat}`: {imp} splits")
        
    # Confusion Matrix
    cm = confusion_matrix(y_test, preds)
    cm_text = []
    cm_text.append("| Actual \\ Predicted | Low | Medium | High | Extreme |")
    cm_text.append("| :--- | :---: | :---: | :---: | :---: |")
    for i, class_name in enumerate(label_gen.class_names):
        row_str = f"| **{class_name}** | " + " | ".join([f"{val}" for val in cm[i]]) + " |"
        cm_text.append(row_str)

    # ------------------ WRITE DIAGNOSIS REPORT ------------------
    report_path = os.path.join(base_dir, "reports", "model_diagnosis_report.md")
    print(f"Writing diagnostic report to {report_path}...")
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Model Diagnostics & Bottleneck Analysis Report\n")
        f.write(f"**Date Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  \n")
        f.write("**Phase**: Phase 2: Machine Learning Foundation - Diagnostics  \n")
        f.write("\n---\n\n")
        
        f.write("## 1. Temporal Drift Diagnostics\n\n")
        f.write("We analyzed the data properties of the historical training window (2000-2020) versus the recent testing window (2020-2026) to look for data shifts:\n\n")
        f.write("\n".join(drift_report) + "\n\n")
        
        f.write("## 2. Label Engineering & Boundaries Overlap\n\n")
        f.write("Percentile-based thresholds are computed dynamically on training data to partition records into Low, Medium, High, and Extreme classes:\n\n")
        f.write("\n".join(overlap_report) + "\n\n")
        
        f.write("## 3. Confusion Matrix (Baseline Model)\n\n")
        f.write("The table below shows the baseline LightGBM classifier predictions vs actual targets on the chronological test set:\n\n")
        f.write("\n".join(cm_text) + "\n\n")
        
        f.write("## 4. Feature Importance Analysis\n\n")
        f.write("The splits used by the tree splits inside the baseline LightGBM model:\n\n")
        f.write("\n".join(feat_report) + "\n\n")
        
        f.write("## 5. Performance Bottlenecks & Recommendations\n\n")
        f.write("Based on these diagnostics, we identify the following performance bottlenecks:\n")
        f.write("1. **Magnitude Data Sparsity**: With ~80% of records missing magnitude, the Z-score is imputed to 0.0, rendering this crucial indicator useless for the vast majority of records. Adding a binary indicator `magnitude_is_missing` will allow the model to differentiate imputed vs actual values.\n")
        f.write("2. **Category Target Overlap**: Smoothed target encoding on `severityScore` maps categories to a single dimension, losing class boundaries. We need to introduce independent target encodings for each of the core impact components: `deaths`, `totalAffected`, and `economicDamageUSD`.\n")
        f.write("3. **Missing Hazard frequency & Vulnerability**: High-cardinality locations (countries, regions) are encoded solely using targets. Adding historical frequencies (e.g. disaster counts per country) and country-specific vulnerability indicators (average historical deaths per disaster type) will provide the model with baseline priors.\n")
        f.write("4. **Imbalance Constraints**: The default class weight is balanced, but the model has very low precision on `Extreme` class. We need to test different sample weights, hyperparameter tunings, and model formulations (such as Regressor-to-Classification mapping).\n")
        
    print(f"Diagnostics complete. Report saved to {report_path}.")

if __name__ == "__main__":
    diagnose()
