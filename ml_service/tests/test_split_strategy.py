import unittest
import numpy as np
import pandas as pd
import os
import sys
from datetime import datetime

# Resolve paths to import ml_service
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, base_dir)

from src.split_strategy import TimeSeriesDataSplitter

class TestTimeSeriesDataSplitter(unittest.TestCase):
    def setUp(self):
        # Create a mock unsorted dataset
        self.df = pd.DataFrame({
            'id': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            'startDate': [
                datetime(2025, 6, 1),   # 6
                datetime(2020, 1, 1),   # 1 (earliest)
                datetime(2026, 3, 1),   # 9
                datetime(2021, 5, 12),  # 2
                datetime(2026, 6, 18),  # 10 (latest)
                datetime(2022, 11, 3),  # 3
                datetime(2023, 8, 15),  # 4
                datetime(2024, 2, 28),  # 5
                datetime(2025, 10, 10), # 7
                datetime(2025, 12, 25)  # 8
            ]
        })
        self.splitter = TimeSeriesDataSplitter(date_col='startDate')

    def test_chronological_sorting(self):
        # Test internal sorting logic
        sorted_df = self.splitter._sort_data(self.df)
        
        # Check that dates are strictly ascending
        dates = sorted_df['startDate'].tolist()
        for i in range(len(dates) - 1):
            self.assertTrue(dates[i] <= dates[i+1])
            
        # First should be ID 2 (2020-01-01)
        self.assertEqual(sorted_df.loc[0, 'id'], 2)
        # Last should be ID 5 (2026-06-18)
        self.assertEqual(sorted_df.loc[9, 'id'], 5)

    def test_fractional_train_test_split(self):
        # 80/20 split
        train_df, test_df = self.splitter.train_test_split(self.df, test_size=0.2)
        
        self.assertEqual(len(train_df), 8)
        self.assertEqual(len(test_df), 2)
        
        # Verify chronological isolation: max train date <= min test date
        max_train_date = train_df['startDate'].max()
        min_test_date = test_df['startDate'].min()
        self.assertTrue(max_train_date <= min_test_date)
        
        # Check that specific latest ids went to test
        self.assertIn(test_df.loc[0, 'id'], [3, 5])
        self.assertIn(test_df.loc[1, 'id'], [3, 5])

    def test_date_cutoff_train_test_split(self):
        # Split at 2025-01-01
        train_df, test_df = self.splitter.train_test_split_by_date(self.df, split_date='2025-01-01')
        
        # Records before 2025: 2020, 2021, 2022, 2023, 2024 (5 records)
        # Records on/after 2025: 2025-06, 2025-10, 2025-12, 2026-03, 2026-06 (5 records)
        self.assertEqual(len(train_df), 5)
        self.assertEqual(len(test_df), 5)
        
        # Check date boundaries
        self.assertTrue((train_df['startDate'] < pd.Timestamp('2025-01-01')).all())
        self.assertTrue((test_df['startDate'] >= pd.Timestamp('2025-01-01')).all())

    def test_cross_validation_splits(self):
        splits = list(self.splitter.get_cv_splits(self.df, n_splits=3))
        self.assertEqual(len(splits), 3)
        
        for idx, (train_df, val_df) in enumerate(splits):
            # Check validation follows train chronologically
            max_train_date = train_df['startDate'].max()
            min_val_date = val_df['startDate'].min()
            self.assertTrue(max_train_date <= min_val_date)
            
            # Size validation: TimeSeriesSplit yields increasing training sizes
            if idx > 0:
                prev_train_df, _ = splits[idx - 1]
                self.assertTrue(len(train_df) > len(prev_train_df))

if __name__ == '__main__':
    unittest.main()
