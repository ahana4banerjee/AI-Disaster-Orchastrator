import numpy as np
import pandas as pd
import calendar
from sklearn.base import BaseEstimator, TransformerMixin, ClassifierMixin
from typing import List, Dict, Any, Union, Optional

class TargetLogScaler:
    """
    Log transformer for target variables: z = ln(y + 1).
    Supports back-transformation: y = max(0, exp(z) - 1).
    """
    @staticmethod
    def transform(y: Union[np.ndarray, pd.Series, pd.DataFrame, float, int]) -> Union[np.ndarray, pd.Series, pd.DataFrame, float]:
        if isinstance(y, (pd.Series, pd.DataFrame)):
            return np.log1p(y)
        elif isinstance(y, np.ndarray):
            return np.log1p(y)
        else:
            return float(np.log1p(float(y)))

    @staticmethod
    def inverse_transform(z: Union[np.ndarray, pd.Series, pd.DataFrame, float]) -> Union[np.ndarray, pd.Series, pd.DataFrame, float]:
        if isinstance(z, (pd.Series, pd.DataFrame)):
            return np.expm1(z).clip(lower=0)
        elif isinstance(z, np.ndarray):
            return np.expm1(z).clip(min=0)
        else:
            return float(max(0.0, np.expm1(float(z))))

class CyclicMonthTransformer(BaseEstimator, TransformerMixin):
    """
    Transforms startDate into sine and cosine features based on month.
    """
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        X = pd.DataFrame(X).copy()
        months = np.zeros(len(X))
        
        if 'startDate' in X.columns:
            # Parse datetime
            col = pd.to_datetime(X['startDate'], errors='coerce')
            months = col.dt.month.fillna(6).values
        elif 'Start Month' in X.columns:
            months = pd.to_numeric(X['Start Month'], errors='coerce').fillna(6).values
        else:
            # Default to June (6) if no date column matches
            months = np.full(len(X), 6)

        sin_month = np.sin(2 * np.pi * months / 12.0)
        cos_month = np.cos(2 * np.pi * months / 12.0)
        
        X['sin_month'] = np.round(sin_month, 6)
        X['cos_month'] = np.round(cos_month, 6)
        return X

class GroupMagnitudeNormalizer(BaseEstimator, TransformerMixin):
    """
    Calculates group-wise Z-score normalization of 'magnitude' grouped by 'disasterType'.
    Uses global Z-score fallback if disasterType is missing or unseen.
    """
    def __init__(self):
        self.group_stats_ = {}
        self.global_mean_ = 0.0
        self.global_std_ = 1.0

    def fit(self, X, y=None):
        X = pd.DataFrame(X).copy()
        
        if 'magnitude' not in X.columns:
            return self
            
        mags = pd.to_numeric(X['magnitude'], errors='coerce')
        self.global_mean_ = float(mags.mean()) if not mags.isnull().all() else 0.0
        self.global_std_ = float(mags.std()) if not mags.isnull().all() and mags.std() > 0 else 1.0
        if np.isnan(self.global_mean_):
            self.global_mean_ = 0.0
        if np.isnan(self.global_std_):
            self.global_std_ = 1.0

        if 'disasterType' in X.columns:
            grouped = X.groupby('disasterType')['magnitude']
            for name, group in grouped:
                g_mags = pd.to_numeric(group, errors='coerce')
                mean = float(g_mags.mean()) if not g_mags.isnull().all() else self.global_mean_
                std = float(g_mags.std()) if not g_mags.isnull().all() and g_mags.std() > 0 else 1.0
                if np.isnan(mean):
                    mean = self.global_mean_
                if np.isnan(std):
                    std = self.global_std_
                self.group_stats_[name] = {'mean': mean, 'std': std}
        return self

    def transform(self, X):
        X = pd.DataFrame(X).copy()
        normalized = np.zeros(len(X))
        
        # Fast Z-scoring
        for i, (_, row) in enumerate(X.iterrows()):
            mag_val = row.get('magnitude')
            try:
                mag = float(mag_val) if mag_val is not None and str(mag_val).strip() != "" else np.nan
            except (ValueError, TypeError):
                mag = np.nan
                
            dist_type = row.get('disasterType')
            
            if np.isnan(mag):
                normalized[i] = 0.0
            else:
                stats = self.group_stats_.get(dist_type)
                if stats:
                    mean = stats['mean']
                    std = stats['std']
                else:
                    mean = self.global_mean_
                    std = self.global_std_
                
                normalized[i] = (mag - mean) / (std + 1e-6)
                
        X['magnitude_normalized'] = normalized
        return X

class SmoothedTargetEncoder(BaseEstimator, TransformerMixin):
    """
    Smoothed target encoder for high-cardinality categorical variables.
    Formula: Encoded_Val = (n_c * mean_c + m * global_mean) / (n_c + m)
    Supports out-of-fold K-Fold target encoding during fit_transform to prevent target leakage.
    """
    def __init__(self, cols: List[str], smoothing: float = 10.0, kfold: bool = False, n_splits: int = 5, random_state: int = 42):
        self.cols = cols
        self.smoothing = smoothing
        self.kfold = kfold
        self.n_splits = n_splits
        self.random_state = random_state
        self.mappings_ = {}
        self.global_means_ = {}

    def fit(self, X, y):
        X = pd.DataFrame(X).copy()
        y_series = pd.to_numeric(pd.Series(y), errors='coerce').fillna(0.0)
        
        for col in self.cols:
            if col not in X.columns:
                continue
            
            global_mean = float(y_series.mean())
            self.global_means_[col] = global_mean
            
            col_data = X[col].fillna("MISSING").astype(str).values
            counts = {}
            sums = {}
            
            for cat, target in zip(col_data, y_series.values):
                counts[cat] = counts.get(cat, 0) + 1
                sums[cat] = sums.get(cat, 0.0) + target
                
            col_mappings = {}
            for cat, count in counts.items():
                cat_mean = sums[cat] / count
                smoothed = (count * cat_mean + self.smoothing * global_mean) / (count + self.smoothing)
                col_mappings[cat] = smoothed
                
            self.mappings_[col] = col_mappings
            
        return self

    def fit_transform(self, X, y=None):
        X = pd.DataFrame(X).copy()
        if y is None:
            return self.fit(X, y).transform(X)
            
        y_series = pd.to_numeric(pd.Series(y), errors='coerce').fillna(0.0)
        
        # Always run regular fit to populate global mappings for transform time
        self.fit(X, y_series)
        
        if not self.kfold:
            return self.transform(X)
            
        # Run K-Fold target encoding to prevent leakage during training
        from sklearn.model_selection import KFold
        kf = KFold(n_splits=self.n_splits, shuffle=True, random_state=self.random_state)
        
        X_out = X.copy()
        for col in self.cols:
            if col not in X.columns:
                continue
            X_out[f"{col}_encoded"] = np.nan
            
        for train_idx, val_idx in kf.split(X):
            X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_tr = y_series.iloc[train_idx]
            
            for col in self.cols:
                if col not in X.columns:
                    continue
                global_mean = float(y_tr.mean())
                col_data_tr = X_tr[col].fillna("MISSING").astype(str).values
                counts = {}
                sums = {}
                for cat, val in zip(col_data_tr, y_tr.values):
                    counts[cat] = counts.get(cat, 0) + 1
                    sums[cat] = sums.get(cat, 0.0) + val
                    
                col_mappings = {}
                for cat, count in counts.items():
                    cat_mean = sums[cat] / count
                    col_mappings[cat] = (count * cat_mean + self.smoothing * global_mean) / (count + self.smoothing)
                    
                col_data_val = X_val[col].fillna("MISSING").astype(str).values
                encoded_val = np.array([col_mappings.get(cat, global_mean) for cat in col_data_val])
                X_out.iloc[val_idx, X_out.columns.get_loc(f"{col}_encoded")] = encoded_val
                
        for col in self.cols:
            if col not in X.columns:
                continue
            global_mean = self.global_means_.get(col, 0.0)
            X_out[f"{col}_encoded"] = X_out[f"{col}_encoded"].fillna(global_mean)
            
        return X_out

    def transform(self, X):
        X = pd.DataFrame(X).copy()
        for col in self.cols:
            if col not in X.columns:
                continue
                
            col_mappings = self.mappings_.get(col, {})
            global_mean = self.global_means_.get(col, 0.0)
            
            col_data = X[col].fillna("MISSING").astype(str).values
            encoded = np.array([col_mappings.get(cat, global_mean) for cat in col_data])
            
            X[f"{col}_encoded"] = encoded
            
        return X

class DisasterPreprocessor(BaseEstimator, TransformerMixin):
    """
    Main orchestrator pipeline for preprocessing EM-DAT disaster records.
    Fits all individual transformers and outputs a clean numeric feature matrix.
    """
    def __init__(self, categorical_cols: List[str] = None, smoothing: float = 10.0, kfold: bool = False, include_duration: bool = False, include_coordinates: bool = False):
        if categorical_cols is None:
            categorical_cols = ['disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion']
        self.categorical_cols = categorical_cols
        self.smoothing = smoothing
        self.kfold = kfold
        self.include_duration = include_duration
        self.include_coordinates = include_coordinates
        
        self.month_transformer = CyclicMonthTransformer()
        self.magnitude_normalizer = GroupMagnitudeNormalizer()
        self.target_encoder = SmoothedTargetEncoder(cols=self.categorical_cols, smoothing=self.smoothing, kfold=self.kfold)
        
        self.fitted_ = False

    def fit(self, X, y=None):
        X_df = pd.DataFrame(X).copy()
        
        # Fallback target for encoding
        if y is None:
            if 'severityScore' in X_df.columns:
                y = X_df['severityScore']
            else:
                y = np.zeros(len(X_df))
                
        self.month_transformer.fit(X_df)
        self.magnitude_normalizer.fit(X_df)
        self.target_encoder.fit(X_df, y)
        self.fitted_ = True
        return self
    
    def transform(self, X):
        if not self.fitted_:
            raise ValueError("DisasterPreprocessor must be fitted before transformation.")
            
        X_df = pd.DataFrame(X).copy()
        
        X_df = self.month_transformer.transform(X_df)
        X_df = self.magnitude_normalizer.transform(X_df)
        X_df = self.target_encoder.transform(X_df)
        
        output_cols = ['sin_month', 'cos_month', 'magnitude_normalized']
        for col in self.categorical_cols:
            if f"{col}_encoded" in X_df.columns:
                output_cols.append(f"{col}_encoded")
                
        if self.include_duration:
            durations = []
            for _, r in X_df.iterrows():
                sd = r.get("startDate")
                ed = r.get("endDate")
                if pd.notnull(sd) and pd.notnull(ed):
                    durations.append((pd.to_datetime(ed) - pd.to_datetime(sd)).days)
                else:
                    durations.append(0)
            X_df['duration_days'] = durations
            output_cols.append('duration_days')
            
        if self.include_coordinates:
            X_df['longitude'] = pd.to_numeric(X_df.get('longitude', 0.0), errors='coerce').fillna(0.0)
            X_df['latitude'] = pd.to_numeric(X_df.get('latitude', 0.0), errors='coerce').fillna(0.0)
            X_df['abs_latitude'] = np.abs(X_df['latitude'])
            output_cols.extend(['longitude', 'latitude', 'abs_latitude'])
                
        return X_df[output_cols].fillna(0.0)
        
    def fit_transform(self, X, y=None):
        self.fit(X, y)
        if self.kfold and y is not None:
            X_df = pd.DataFrame(X).copy()
            X_df = self.month_transformer.transform(X_df)
            X_df = self.magnitude_normalizer.transform(X_df)
            
            encoded_df = self.target_encoder.fit_transform(X_df, y)
            for col in self.categorical_cols:
                X_df[f"{col}_encoded"] = encoded_df[f"{col}_encoded"]
                
            output_cols = ['sin_month', 'cos_month', 'magnitude_normalized']
            for col in self.categorical_cols:
                if f"{col}_encoded" in X_df.columns:
                    output_cols.append(f"{col}_encoded")
                    
            if self.include_duration:
                durations = []
                for _, r in X_df.iterrows():
                    sd = r.get("startDate")
                    ed = r.get("endDate")
                    if pd.notnull(sd) and pd.notnull(ed):
                        durations.append((pd.to_datetime(ed) - pd.to_datetime(sd)).days)
                    else:
                        durations.append(0)
                X_df['duration_days'] = durations
                output_cols.append('duration_days')
                
            if self.include_coordinates:
                X_df['longitude'] = pd.to_numeric(X_df.get('longitude', 0.0), errors='coerce').fillna(0.0)
                X_df['latitude'] = pd.to_numeric(X_df.get('latitude', 0.0), errors='coerce').fillna(0.0)
                X_df['abs_latitude'] = np.abs(X_df['latitude'])
                output_cols.extend(['longitude', 'latitude', 'abs_latitude'])
                
            return X_df[output_cols].fillna(0.0)
        else:
            return self.transform(X)

class SeverityLabelGenerator(BaseEstimator, TransformerMixin):
    """
    Dynamically generates severity class labels ('Low', 'Medium', 'High', 'Extreme') 
    from continuous severity scores using percentile thresholds computed during fit.
    Also supports integer label encoding (0, 1, 2, 3).
    """
    def __init__(self, percentiles: List[float] = None, encode_as_int: bool = False):
        if percentiles is None:
            percentiles = [25.0, 75.0, 95.0]
        self.percentiles = percentiles
        self.encode_as_int = encode_as_int
        self.thresholds_ = []
        self.class_names = ['Low', 'Medium', 'High', 'Extreme']

    def fit(self, y, sample_weight=None):
        y_arr = np.asarray(y)
        self.thresholds_ = [float(np.percentile(y_arr, p)) for p in self.percentiles]
        return self

    def transform(self, y):
        if not self.thresholds_:
            raise ValueError("SeverityLabelGenerator must be fitted before transforming.")
            
        y_arr = np.asarray(y)
        labels = []
        
        p25, p75, p95 = self.thresholds_
        
        for val in y_arr:
            if val <= p25:
                label = 'Low'
            elif val <= p75:
                label = 'Medium'
            elif val <= p95:
                label = 'High'
            else:
                label = 'Extreme'
                
            if self.encode_as_int:
                labels.append(self.class_names.index(label))
            else:
                labels.append(label)
                
        if isinstance(y, (pd.Series, pd.DataFrame)):
            return pd.Series(labels, index=y.index)
        return np.array(labels)

    def inverse_transform(self, y):
        y_arr = np.asarray(y)
        inv_labels = []
        for val in y_arr:
            if self.encode_as_int:
                inv_labels.append(self.class_names[int(val)])
            else:
                inv_labels.append(val)
        return np.array(inv_labels)

class DerivedSeverityClassifier(BaseEstimator, ClassifierMixin):
    """
    Wrapper classifier that predicts impact components (deaths, affected, damage)
    individually, combines them to compute a derived severity score, and maps
    the score to a severity class using a fitted threshold generator.
    """
    def __init__(self, reg_deaths, reg_affected, reg_damage, label_generator):
        self.reg_deaths = reg_deaths
        self.reg_affected = reg_affected
        self.reg_damage = reg_damage
        self.label_generator = label_generator
        self.classes_ = np.array([0, 1, 2, 3])

    def predict(self, X):
        pred_deaths = self.reg_deaths.predict(X)
        pred_affected = self.reg_affected.predict(X)
        pred_damage = self.reg_damage.predict(X)
        
        # Clip negative predictions to 0.0 (since log impact cannot be negative)
        pred_deaths = np.clip(pred_deaths, 0.0, None)
        pred_affected = np.clip(pred_affected, 0.0, None)
        pred_damage = np.clip(pred_damage, 0.0, None)
        
        derived_scores = 0.4 * pred_deaths + 0.3 * pred_affected + 0.3 * pred_damage
        return self.label_generator.transform(derived_scores)

    def predict_impacts(self, X):
        pred_deaths = np.clip(self.reg_deaths.predict(X), 0.0, None)
        pred_affected = np.clip(self.reg_affected.predict(X), 0.0, None)
        pred_damage = np.clip(self.reg_damage.predict(X), 0.0, None)
        
        # Convert log10 back to actual physical values
        actual_deaths = 10**pred_deaths - 1.0
        actual_affected = 10**pred_affected - 1.0
        actual_damage = (10**pred_damage - 1.0) * 1000.0 # damage was scaled in thousands
        
        # Clip lower bound to 0.0
        actual_deaths = np.clip(actual_deaths, 0.0, None)
        actual_affected = np.clip(actual_affected, 0.0, None)
        actual_damage = np.clip(actual_damage, 0.0, None)
        
        return {
            "deaths": actual_deaths,
            "affected": actual_affected,
            "damage": actual_damage
        }
