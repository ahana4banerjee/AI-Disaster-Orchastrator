import unittest
import numpy as np
import pandas as pd
import tempfile
import os
import joblib
from datetime import datetime

# Resolve paths to import ml_service
import sys
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, base_dir)

from src.preprocessing import (
    TargetLogScaler,
    CyclicMonthTransformer,
    GroupMagnitudeNormalizer,
    SmoothedTargetEncoder,
    DisasterPreprocessor,
    SeverityLabelGenerator
)

class TestMLPreprocessing(unittest.TestCase):
    def test_target_log_scaler(self):
        # Test scalar float/int
        y_val = 10.0
        z_val = TargetLogScaler.transform(y_val)
        self.assertAlmostEqual(z_val, np.log1p(y_val))
        
        y_inv = TargetLogScaler.inverse_transform(z_val)
        self.assertAlmostEqual(y_inv, y_val)
        
        # Test array
        arr = np.array([0.0, 5.0, 100.0])
        z_arr = TargetLogScaler.transform(arr)
        np.testing.assert_array_almost_equal(z_arr, np.log1p(arr))
        
        arr_inv = TargetLogScaler.inverse_transform(z_arr)
        np.testing.assert_array_almost_equal(arr_inv, arr)

    def test_cyclic_month_transformer(self):
        transformer = CyclicMonthTransformer()
        
        # Test datetime objects
        df = pd.DataFrame({
            'startDate': [datetime(2025, 1, 15), datetime(2025, 12, 1), pd.NaT]
        })
        
        transformed = transformer.transform(df)
        
        # Jan (1) and Dec (12) cyclic proximity check
        jan_sin = transformed.loc[0, 'sin_month']
        jan_cos = transformed.loc[0, 'cos_month']
        dec_sin = transformed.loc[1, 'sin_month']
        dec_cos = transformed.loc[1, 'cos_month']
        
        self.assertAlmostEqual(jan_sin, np.round(np.sin(2 * np.pi * 1 / 12.0), 6))
        self.assertAlmostEqual(jan_cos, np.round(np.cos(2 * np.pi * 1 / 12.0), 6))
        self.assertAlmostEqual(dec_sin, np.round(np.sin(2 * np.pi * 12 / 12.0), 6))
        self.assertAlmostEqual(dec_cos, np.round(np.cos(2 * np.pi * 12 / 12.0), 6))
        
        # NaT fallback should be June (6) -> sin = 0, cos = -1
        nat_sin = transformed.loc[2, 'sin_month']
        nat_cos = transformed.loc[2, 'cos_month']
        self.assertAlmostEqual(nat_sin, 0.0)
        self.assertAlmostEqual(nat_cos, -1.0)

    def test_group_magnitude_normalizer(self):
        # Create group specific dataset
        df = pd.DataFrame({
            'disasterType': ['Flood', 'Flood', 'Flood', 'Storm', 'Storm', 'Storm'],
            'magnitude': [10.0, 20.0, 30.0, 100.0, 200.0, 300.0]
        })
        # Flood mean = 20, std = 10
        # Storm mean = 200, std = 100
        
        normalizer = GroupMagnitudeNormalizer()
        normalizer.fit(df)
        
        # Check Z-score computation
        transformed = normalizer.transform(df)
        
        # Row 0 (Flood, 10) -> (10 - 20) / 10 = -1.0
        self.assertAlmostEqual(transformed.loc[0, 'magnitude_normalized'], -1.0, places=4)
        # Row 5 (Storm, 300) -> (300 - 200) / 100 = 1.0
        self.assertAlmostEqual(transformed.loc[5, 'magnitude_normalized'], 1.0, places=4)
        
        # Test missing magnitude (impute to 0.0)
        df_missing = pd.DataFrame({
            'disasterType': ['Flood'],
            'magnitude': [None]
        })
        trans_missing = normalizer.transform(df_missing)
        self.assertEqual(trans_missing.loc[0, 'magnitude_normalized'], 0.0)
        
        # Test unseen disaster group
        df_unseen = pd.DataFrame({
            'disasterType': ['Earthquake'],
            'magnitude': [15.0]
        })
        # Global mean = (10+20+30+100+200+300)/6 = 110
        # Global std = std([10,20,30,100,200,300]) = 117.813
        # Z-score = (15 - 110) / 117.813 = -0.80636
        trans_unseen = normalizer.transform(df_unseen)
        self.assertAlmostEqual(trans_unseen.loc[0, 'magnitude_normalized'], (15.0 - normalizer.global_mean_) / normalizer.global_std_, places=4)

    def test_smoothed_target_encoder(self):
        df = pd.DataFrame({
            'country': ['KEN', 'KEN', 'KEN', 'IND', 'IND', 'USA'],
        })
        y = [1.0, 2.0, 3.0, 10.0, 20.0, 30.0]
        # Global mean = 11.0
        # KEN mean = 2.0, count = 3
        # IND mean = 15.0, count = 2
        # USA mean = 30.0, count = 1
        
        encoder = SmoothedTargetEncoder(cols=['country'], smoothing=5.0)
        encoder.fit(df, y)
        
        transformed = encoder.transform(df)
        
        # KEN smoothed target encoding: (3 * 2.0 + 5 * 11.0) / (3 + 5) = 61.0 / 8 = 7.625
        self.assertAlmostEqual(transformed.loc[0, 'country_encoded'], 7.625)
        
        # Test unseen category (should fallback to global mean 11.0)
        df_unseen = pd.DataFrame({'country': ['CAN']})
        trans_unseen = encoder.transform(df_unseen)
        self.assertAlmostEqual(trans_unseen.loc[0, 'country_encoded'], 11.0)

    def test_disaster_preprocessor_orchestrator(self):
        df = pd.DataFrame({
            'startDate': [datetime(2025, 1, 1), datetime(2025, 6, 1), datetime(2025, 12, 1)],
            'disasterType': ['Flood', 'Flood', 'Storm'],
            'country': ['KEN', 'IND', 'KEN'],
            'magnitude': [10.0, 20.0, 100.0],
            'severityScore': [1.0, 2.0, 3.0]
        })
        
        preprocessor = DisasterPreprocessor(categorical_cols=['country', 'disasterType'])
        preprocessor.fit(df)
        
        # Transform data
        X_trans = preprocessor.transform(df)
        
        # Output columns check
        expected_cols = {'sin_month', 'cos_month', 'magnitude_normalized', 'country_encoded', 'disasterType_encoded'}
        self.assertEqual(set(X_trans.columns), expected_cols)
        self.assertEqual(len(X_trans), 3)

        # Test joblib serialization and deserialization
        with tempfile.TemporaryDirectory() as tmpdir:
            model_path = os.path.join(tmpdir, 'preprocessor.joblib')
            joblib.dump(preprocessor, model_path)
            
            loaded_preprocessor = joblib.load(model_path)
            self.assertTrue(loaded_preprocessor.fitted_)
            
            X_trans_loaded = loaded_preprocessor.transform(df)
            pd.testing.assert_frame_equal(X_trans, X_trans_loaded)

    def test_severity_label_generator(self):
        scores = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
        # P25 = 0.325, P75 = 0.775, P95 = 0.955
        
        gen = SeverityLabelGenerator()
        gen.fit(scores)
        
        labels = gen.transform([0.1, 0.3, 0.5, 0.8, 1.0])
        expected_labels = ['Low', 'Low', 'Medium', 'High', 'Extreme']
        np.testing.assert_array_equal(labels, expected_labels)
        
        # Test integer labels
        gen_int = SeverityLabelGenerator(encode_as_int=True)
        gen_int.fit(scores)
        labels_int = gen_int.transform([0.1, 0.3, 0.5, 0.8, 1.0])
        expected_ints = [0, 0, 1, 2, 3]
        np.testing.assert_array_equal(labels_int, expected_ints)
        
        # Test inverse_transform
        inv_labels = gen_int.inverse_transform(labels_int)
        np.testing.assert_array_equal(inv_labels, expected_labels)

if __name__ == '__main__':
    unittest.main()
