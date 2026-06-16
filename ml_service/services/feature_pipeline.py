import numpy as np

class FeaturePipeline:
    @staticmethod
    def cyclical_month_transform(month: int):
        sin_val = np.sin(2 * np.pi * month / 12)
        cos_val = np.cos(2 * np.pi * month / 12)
        return sin_val, cos_val
