import numpy as np
import pandas as pd
import calendar
from sklearn.base import BaseEstimator, TransformerMixin
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
    """
    def __init__(self, cols: List[str], smoothing: float = 10.0):
        self.cols = cols
        self.smoothing = smoothing
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
    def __init__(self, categorical_cols: List[str] = None, smoothing: float = 10.0):
        if categorical_cols is None:
            categorical_cols = ['disasterType', 'disasterSubgroup', 'country', 'iso', 'region', 'subregion']
        self.categorical_cols = categorical_cols
        self.smoothing = smoothing
        
        self.month_transformer = CyclicMonthTransformer()
        self.magnitude_normalizer = GroupMagnitudeNormalizer()
        self.target_encoder = SmoothedTargetEncoder(cols=self.categorical_cols, smoothing=self.smoothing)
        
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
                
        return X_df[output_cols].fillna(0.0)
        
    def fit_transform(self, X, y=None):
        self.fit(X, y)
        return self.transform(X)
