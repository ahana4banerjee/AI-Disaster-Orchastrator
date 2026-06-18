import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime
from pymongo import MongoClient
from lightgbm import LGBMClassifier, LGBMRegressor
from xgboost import XGBClassifier, XGBRegressor
from catboost import CatBoostClassifier, CatBoostRegressor
from sklearn.metrics import f1_score, accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder
import warnings
warnings.filterwarnings('ignore')

# Setup paths to import ml_service modules
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(base_dir, "ml_service"))

from src.split_strategy import TimeSeriesDataSplitter
from src.preprocessing import SeverityLabelGenerator

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
            "damage": r.get("impact", {}).get("economicDamageUSD", 0) or 0.0,
            "longitude": r.get("geoJSON", {}).get("coordinates", [None, None])[0],
            "latitude": r.get("geoJSON", {}).get("coordinates", [None, None])[1]
        }
        flat_records.append(flat)
    return pd.DataFrame(flat_records)

class AdvancedPreprocessor:
    """
    Advanced feature engineering preprocessor.
    Implements:
    - Target encoding on deaths, affected, damage, and severityScore.
    - Hazard frequencies.
    - Geographic features (lat, lon, abs_latitude).
    - Magnitude normalization and missingness flag.
    - Temporal features (month cyclic, year, elapsed_days).
    """
    def __init__(self, smoothing: float = 10.0):
        self.smoothing = smoothing
        self.cat_cols = ['disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion', 'country_disasterType']
        self.target_cols = ['severityScore', 'log_deaths', 'log_affected', 'log_damage']
        self.mappings_ = {}
        self.global_means_ = {}
        
        # Magnitude normalization stats
        self.group_stats_ = {}
        self.global_mag_mean_ = 0.0
        self.global_mag_std_ = 1.0
        
        # Hazard frequencies
        self.hazard_freq_country_ = {}
        self.hazard_freq_global_ = {}

    def fit(self, X_df, train_df):
        # Create helper targets for encoding
        y_score = train_df['severityScore'].values
        y_deaths = np.log1p(train_df['deaths'].values)
        y_affected = np.log1p(train_df['affected'].values)
        y_damage = np.log1p(train_df['damage'].values / 1000.0) # in thousands
        
        targets = {
            'severityScore': y_score,
            'log_deaths': y_deaths,
            'log_affected': y_affected,
            'log_damage': y_damage
        }
        
        # Fit Target Encodings
        for col in self.cat_cols:
            if col == 'country_disasterType':
                col_data = (train_df['country'].fillna("MISSING") + "_" + train_df['disasterType'].fillna("MISSING")).astype(str).values
            else:
                col_data = train_df[col].fillna("MISSING").astype(str).values
                
            col_mappings = {}
            col_global_means = {}
            
            for t_name, y_val in targets.items():
                global_mean = float(y_val.mean())
                col_global_means[t_name] = global_mean
                
                counts = {}
                sums = {}
                for cat, target in zip(col_data, y_val):
                    counts[cat] = counts.get(cat, 0) + 1
                    sums[cat] = sums.get(cat, 0.0) + target
                    
                cat_mappings = {}
                for cat, count in counts.items():
                    cat_mean = sums[cat] / count
                    smoothed = (count * cat_mean + self.smoothing * global_mean) / (count + self.smoothing)
                    cat_mappings[cat] = smoothed
                    
                col_mappings[t_name] = cat_mappings
                
            self.mappings_[col] = col_mappings
            self.global_means_[col] = col_global_means

        # Fit Magnitude Normalization
        mags = pd.to_numeric(train_df['magnitude'], errors='coerce')
        self.global_mag_mean_ = float(mags.mean()) if not mags.isnull().all() else 0.0
        self.global_mag_std_ = float(mags.std()) if not mags.isnull().all() and mags.std() > 0 else 1.0
        
        grouped = train_df.groupby('disasterType')['magnitude']
        for name, group in grouped:
            g_mags = pd.to_numeric(group, errors='coerce')
            mean = float(g_mags.mean()) if not g_mags.isnull().all() else self.global_mag_mean_
            std = float(g_mags.std()) if not g_mags.isnull().all() and g_mags.std() > 0 else 1.0
            self.group_stats_[name] = {'mean': mean, 'std': std}

        # Fit Hazard Frequencies
        total_global = len(train_df)
        type_counts = train_df['disasterType'].value_counts().to_dict()
        self.hazard_freq_global_ = {k: v / total_global for k, v in type_counts.items()}
        
        country_counts = train_df['country'].value_counts().to_dict()
        country_type_counts = train_df.groupby(['country', 'disasterType']).size().to_dict()
        for (country, dtype), count in country_type_counts.items():
            total_country = country_counts.get(country, 1)
            self.hazard_freq_country_[(country, dtype)] = count / total_country

        return self

    def transform(self, df):
        df_copy = df.copy()
        X_out = pd.DataFrame(index=df.index)
        
        # 1. Temporal features
        dates = pd.to_datetime(df_copy['startDate'])
        X_out['year'] = dates.dt.year.fillna(2000)
        
        months = dates.dt.month.fillna(6).values
        X_out['sin_month'] = np.round(np.sin(2 * np.pi * months / 12.0), 6)
        X_out['cos_month'] = np.round(np.cos(2 * np.pi * months / 12.0), 6)
        
        ref_date = datetime(2000, 1, 1)
        X_out['elapsed_days'] = (dates - ref_date).dt.days.fillna(0)

        # 2. Geographic features
        X_out['longitude'] = pd.to_numeric(df_copy['longitude'], errors='coerce').fillna(0.0)
        X_out['latitude'] = pd.to_numeric(df_copy['latitude'], errors='coerce').fillna(0.0)
        X_out['abs_latitude'] = np.abs(X_out['latitude'])

        # 3. Magnitude features
        mag_vals = pd.to_numeric(df_copy['magnitude'], errors='coerce')
        X_out['magnitude_is_missing'] = mag_vals.isnull().astype(int)
        
        normalized = np.zeros(len(df_copy))
        for idx, (_, row) in enumerate(df_copy.iterrows()):
            mag = mag_vals.iloc[idx]
            dist_type = row.get('disasterType')
            if np.isnan(mag):
                normalized[idx] = 0.0
            else:
                stats = self.group_stats_.get(dist_type)
                if stats:
                    mean = stats['mean']
                    std = stats['std']
                else:
                    mean = self.global_mag_mean_
                    std = self.global_mag_std_
                normalized[idx] = (mag - mean) / (std + 1e-6)
        X_out['magnitude_normalized'] = normalized

        # 4. Target encoded categorical features
        for col in self.cat_cols:
            if col == 'country_disasterType':
                col_data = (df_copy['country'].fillna("MISSING") + "_" + df_copy['disasterType'].fillna("MISSING")).astype(str).values
            else:
                col_data = df_copy[col].fillna("MISSING").astype(str).values
                
            mappings = self.mappings_.get(col, {})
            global_means = self.global_means_.get(col, {})
            
            for t_name in self.target_cols:
                col_mappings = mappings.get(t_name, {})
                g_mean = global_means.get(t_name, 0.0)
                
                encoded = np.array([col_mappings.get(cat, g_mean) for cat in col_data])
                X_out[f"{col}_encoded_on_{t_name}"] = encoded

        # 5. Hazard Frequencies
        freq_country = np.zeros(len(df_copy))
        freq_global = np.zeros(len(df_copy))
        for idx, (_, row) in enumerate(df_copy.iterrows()):
            country = row.get('country')
            dtype = row.get('disasterType')
            freq_country[idx] = self.hazard_freq_country_.get((country, dtype), 0.0)
            freq_global[idx] = self.hazard_freq_global_.get(dtype, 0.0)
            
        X_out['hazard_freq_country'] = freq_country
        X_out['hazard_freq_global'] = freq_global

        return X_out

def main():
    print("Loading data...")
    df = fetch_data()
    
    # Verify we have enough data
    if len(df) < 100:
        print(f"Error: Too few records in database ({len(df)}). Please run ingestion script first.")
        sys.exit(1)
        
    print("\n--- Splitting Data Chronologically ---")
    splitter = TimeSeriesDataSplitter(date_col='startDate')
    train_df, test_df = splitter.train_test_split(df, test_size=0.2)
    print(f"Train records: {len(train_df)} (from {train_df['startDate'].min().date()} to {train_df['startDate'].max().date()})")
    print(f"Test records: {len(test_df)} (from {test_df['startDate'].min().date()} to {test_df['startDate'].max().date()})")
    
    # Preprocessing
    print("Fitting Advanced Preprocessor...")
    preprocessor = AdvancedPreprocessor(smoothing=10.0)
    preprocessor.fit(train_df, train_df)
    
    X_train = preprocessor.transform(train_df)
    X_test = preprocessor.transform(test_df)
    
    print(f"Features dimension: {X_train.shape}")
    
    # Class labels
    label_gen = SeverityLabelGenerator(encode_as_int=True)
    label_gen.fit(train_df['severityScore'])
    p25, p75, p95 = label_gen.thresholds_
    print(f"Train thresholds (P25, P75, P95): {p25:.4f}, {p75:.4f}, {p95:.4f}")
    
    y_train = label_gen.transform(train_df['severityScore'])
    y_test = label_gen.transform(test_df['severityScore'])
    
    results = []
    
    # ------------------ CLASSIFICATION EXPERIMENTS ------------------
    print("\n--- Running Classification Model Experiments ---")
    
    # 1. LightGBM Classifier
    print("Training LightGBM Classifier...")
    lgb_clf = LGBMClassifier(
        objective='multiclass',
        num_class=4,
        class_weight='balanced',
        learning_rate=0.03,
        n_estimators=200,
        random_state=42,
        verbose=-1
    )
    lgb_clf.fit(X_train, y_train)
    preds = lgb_clf.predict(X_test)
    lgb_f1 = f1_score(y_test, preds, average='macro')
    lgb_acc = accuracy_score(y_test, preds)
    # Let's count actual recall on Extreme
    ext_recall = classification_report(y_test, preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['recall']
    ext_precision = classification_report(y_test, preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['precision']
    
    results.append({
        "Model": "LightGBM Classifier",
        "Formulation": "Multiclass Direct",
        "Accuracy": lgb_acc,
        "Macro F1": lgb_f1,
        "Extreme Recall": ext_recall,
        "Extreme Precision": ext_precision
    })
    
    # 2. XGBoost Classifier
    print("Training XGBoost Classifier...")
    # Calculate class weights for XGBoost
    from sklearn.utils.class_weight import compute_class_weight
    classes = np.unique(y_train)
    weights = compute_class_weight('balanced', classes=classes, y=y_train)
    weight_dict = {c: w for c, w in zip(classes, weights)}
    sample_weights = np.array([weight_dict[y] for y in y_train])
    
    xgb_clf = XGBClassifier(
        objective='multi:softprob',
        num_class=4,
        learning_rate=0.03,
        n_estimators=200,
        random_state=42,
        verbosity=0
    )
    xgb_clf.fit(X_train, y_train, sample_weight=sample_weights)
    preds = xgb_clf.predict(X_test)
    xgb_f1 = f1_score(y_test, preds, average='macro')
    xgb_acc = accuracy_score(y_test, preds)
    ext_recall = classification_report(y_test, preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['recall']
    ext_precision = classification_report(y_test, preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['precision']
    
    results.append({
        "Model": "XGBoost Classifier",
        "Formulation": "Multiclass Direct",
        "Accuracy": xgb_acc,
        "Macro F1": xgb_f1,
        "Extreme Recall": ext_recall,
        "Extreme Precision": ext_precision
    })
    
    # 3. CatBoost Classifier
    print("Training CatBoost Classifier...")
    cat_clf = CatBoostClassifier(
        loss_function='MultiClass',
        auto_class_weights='Balanced',
        learning_rate=0.03,
        iterations=200,
        random_seed=42,
        verbose=0
    )
    cat_clf.fit(X_train, y_train)
    preds = cat_clf.predict(X_test).flatten()
    cat_f1 = f1_score(y_test, preds, average='macro')
    cat_acc = accuracy_score(y_test, preds)
    ext_recall = classification_report(y_test, preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['recall']
    ext_precision = classification_report(y_test, preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['precision']
    
    results.append({
        "Model": "CatBoost Classifier",
        "Formulation": "Multiclass Direct",
        "Accuracy": cat_acc,
        "Macro F1": cat_f1,
        "Extreme Recall": ext_recall,
        "Extreme Precision": ext_precision
    })

    # ------------------ REGRESSION-TO-CLASSIFICATION EXPERIMENTS ------------------
    print("\n--- Running Regression-to-Classification Model Experiments ---")
    y_train_score = train_df['severityScore']
    y_test_score = test_df['severityScore']

    # Helper function to predict classes using dynamic percentile thresholding
    def predict_classes_via_percentiles(pred_scores, y_train_preds, y_train_score):
        # We compute thresholds based on the percentiles of the PREDICTIONS on the train set
        # to ensure the same class proportions are maintained
        t25 = np.percentile(y_train_preds, 25)
        t75 = np.percentile(y_train_preds, 75)
        t95 = np.percentile(y_train_preds, 95)
        
        labels = []
        for val in pred_scores:
            if val <= t25: labels.append(0)
            elif val <= t75: labels.append(1)
            elif val <= t95: labels.append(2)
            else: labels.append(3)
        return np.array(labels)

    # 4. LightGBM Regressor + Dynamic Thresholding
    print("Training LightGBM Regressor...")
    lgb_reg = LGBMRegressor(
        learning_rate=0.03,
        n_estimators=300,
        random_state=42,
        verbose=-1
    )
    lgb_reg.fit(X_train, y_train_score)
    train_preds = lgb_reg.predict(X_train)
    test_preds = lgb_reg.predict(X_test)
    
    # Dynamic thresholding
    preds = predict_classes_via_percentiles(test_preds, train_preds, y_train_score)
    lgb_reg_f1 = f1_score(y_test, preds, average='macro')
    lgb_reg_acc = accuracy_score(y_test, preds)
    ext_recall = classification_report(y_test, preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['recall']
    ext_precision = classification_report(y_test, preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['precision']
    
    results.append({
        "Model": "LightGBM Regressor",
        "Formulation": "Regression + Dynamic Thresholds",
        "Accuracy": lgb_reg_acc,
        "Macro F1": lgb_reg_f1,
        "Extreme Recall": ext_recall,
        "Extreme Precision": ext_precision
    })

    # 5. XGBoost Regressor + Dynamic Thresholding
    print("Training XGBoost Regressor...")
    xgb_reg = XGBRegressor(
        learning_rate=0.03,
        n_estimators=300,
        random_state=42,
        verbosity=0
    )
    xgb_reg.fit(X_train, y_train_score)
    train_preds = xgb_reg.predict(X_train)
    test_preds = xgb_reg.predict(X_test)
    
    preds = predict_classes_via_percentiles(test_preds, train_preds, y_train_score)
    xgb_reg_f1 = f1_score(y_test, preds, average='macro')
    xgb_reg_acc = accuracy_score(y_test, preds)
    ext_recall = classification_report(y_test, preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['recall']
    ext_precision = classification_report(y_test, preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['precision']
    
    results.append({
        "Model": "XGBoost Regressor",
        "Formulation": "Regression + Dynamic Thresholds",
        "Accuracy": xgb_reg_acc,
        "Macro F1": xgb_reg_f1,
        "Extreme Recall": ext_recall,
        "Extreme Precision": ext_precision
    })

    # 6. CatBoost Regressor + Dynamic Thresholding
    print("Training CatBoost Regressor...")
    cat_reg = CatBoostRegressor(
        learning_rate=0.03,
        iterations=300,
        random_seed=42,
        verbose=0
    )
    cat_reg.fit(X_train, y_train_score)
    train_preds = cat_reg.predict(X_train)
    test_preds = cat_reg.predict(X_test)
    
    preds = predict_classes_via_percentiles(test_preds, train_preds, y_train_score)
    cat_reg_f1 = f1_score(y_test, preds, average='macro')
    cat_reg_acc = accuracy_score(y_test, preds)
    ext_recall = classification_report(y_test, preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['recall']
    ext_precision = classification_report(y_test, preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['precision']
    
    results.append({
        "Model": "CatBoost Regressor",
        "Formulation": "Regression + Dynamic Thresholds",
        "Accuracy": cat_reg_acc,
        "Macro F1": cat_reg_f1,
        "Extreme Recall": ext_recall,
        "Extreme Precision": ext_precision
    })

    # ------------------ SEVERITY LABEL REDESIGN EXPERIMENT ------------------
    # Wait, can we improve performance by training on target-encoded inputs of the REGRESSION outputs
    # and searching for thresholds that directly maximize F1-macro via threshold search?
    print("\n--- Running Threshold Optimization on LightGBM Regressor ---")
    
    # We will run a grid search on train predictions to find the thresholds that maximize train F1-macro,
    # and see how they perform on the test set.
    best_f1 = 0
    best_thresholds = [p25, p75, p95]
    
    # Quick random search for thresholds
    print("Optimizing thresholds for F1-Macro...")
    for _ in range(2000):
        # Propose random thresholds in ascending order
        t25 = np.random.uniform(0.1, 1.2)
        t75 = np.random.uniform(1.2, 2.5)
        t95 = np.random.uniform(2.5, 4.5)
        
        temp_labels = []
        for val in train_preds:
            if val <= t25: temp_labels.append(0)
            elif val <= t75: temp_labels.append(1)
            elif val <= t95: temp_labels.append(2)
            else: temp_labels.append(3)
            
        score = f1_score(y_train, temp_labels, average='macro')
        if score > best_f1:
            best_f1 = score
            best_thresholds = [t25, t75, t95]
            
    print(f"Optimal Thresholds found: {best_thresholds} (Train F1-Macro: {best_f1:.4f})")
    
    # Apply optimal thresholds to test set
    t25, t75, t95 = best_thresholds
    opt_preds = []
    for val in test_preds:
        if val <= t25: opt_preds.append(0)
        elif val <= t75: opt_preds.append(1)
        elif val <= t95: opt_preds.append(2)
        else: opt_preds.append(3)
        
    opt_f1 = f1_score(y_test, opt_preds, average='macro')
    opt_acc = accuracy_score(y_test, opt_preds)
    ext_recall = classification_report(y_test, opt_preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['recall']
    ext_precision = classification_report(y_test, opt_preds, target_names=label_gen.class_names, output_dict=True)['Extreme']['precision']
    
    results.append({
        "Model": "LightGBM Regressor (Opt)",
        "Formulation": "Regression + Optimized F1 Thresholds",
        "Accuracy": opt_acc,
        "Macro F1": opt_f1,
        "Extreme Recall": ext_recall,
        "Extreme Precision": ext_precision
    })

    # Output comparison table
    res_df = pd.DataFrame(results)
    print("\n--- MODEL EXPERIMENTATION COMPARISON TABLE ---")
    print(res_df.to_string(index=False))
    
    res_df.to_csv(os.path.join(base_dir, "reports", "model_comparison_results.csv"), index=False)

if __name__ == "__main__":
    main()
