import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit
from typing import Tuple, Generator, Union

class TimeSeriesDataSplitter:
    """
    Time-series train-test split strategy for disaster records.
    Ensures dataset is sorted chronologically by 'startDate' to prevent look-ahead bias.
    """
    def __init__(self, date_col: str = 'startDate'):
        self.date_col = date_col

    def _sort_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Ensures the data is sorted chronologically by the configured date column.
        """
        df_copy = df.copy()
        if self.date_col not in df_copy.columns:
            raise KeyError(f"Date column '{self.date_col}' not found in DataFrame.")
        
        # Ensure conversion to datetime
        df_copy[self.date_col] = pd.to_datetime(df_copy[self.date_col])
        return df_copy.sort_values(by=self.date_col).reset_index(drop=True)

    def train_test_split(self, df: pd.DataFrame, test_size: float = 0.2) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Splits data chronologically.
        The first (1 - test_size) fraction is train, and the last test_size fraction is test.
        """
        if not (0.0 < test_size < 1.0):
            raise ValueError("test_size must be between 0.0 and 1.0 (exclusive).")
            
        sorted_df = self._sort_data(df)
        split_idx = int(len(sorted_df) * (1 - test_size))
        
        train_df = sorted_df.iloc[:split_idx].reset_index(drop=True)
        test_df = sorted_df.iloc[split_idx:].reset_index(drop=True)
        
        return train_df, test_df

    def train_test_split_by_date(self, df: pd.DataFrame, split_date: Union[str, pd.Timestamp]) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Splits data chronologically at a specific date.
        Train consists of records before split_date, test consists of records on or after split_date.
        """
        sorted_df = self._sort_data(df)
        ts_cutoff = pd.to_datetime(split_date)
        
        train_df = sorted_df[sorted_df[self.date_col] < ts_cutoff].reset_index(drop=True)
        test_df = sorted_df[sorted_df[self.date_col] >= ts_cutoff].reset_index(drop=True)
        
        return train_df, test_df

    def get_cv_splits(self, df: pd.DataFrame, n_splits: int = 5) -> Generator[Tuple[pd.DataFrame, pd.DataFrame], None, None]:
        """
        Generator yielding train and validation splits using scikit-learn TimeSeriesSplit.
        Ensures chronological order is maintained for each split.
        """
        sorted_df = self._sort_data(df)
        tscv = TimeSeriesSplit(n_splits=n_splits)
        
        for train_idx, val_idx in tscv.split(sorted_df):
            train_df = sorted_df.iloc[train_idx].reset_index(drop=True)
            val_df = sorted_df.iloc[val_idx].reset_index(drop=True)
            yield train_df, val_df
