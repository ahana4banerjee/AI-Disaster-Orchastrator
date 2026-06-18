# Model Diagnostics & Bottleneck Analysis Report
**Date Generated**: 2026-06-18 21:07:57  
**Phase**: Phase 2: Machine Learning Foundation - Diagnostics  

---

## 1. Temporal Drift Diagnostics

We analyzed the data properties of the historical training window (2000-2020) versus the recent testing window (2020-2026) to look for data shifts:

- **Severity Score Mean**: Train = 1.3925, Test = 1.4387 (Change: +3.32%)
- **Magnitude Mean**: Train = 67524.4504, Test = 2203.1275 (Change: -96.74%)
- **Missing Magnitude Ratio**: Train = 78.10%, Test = 86.90%

- **Top Disaster Types Distribution (Train vs Test)**:
  - `Flood`: Train = 24.72%, Test = 28.17%
  - `Storm`: Train = 15.50%, Test = 23.62%
  - `Road`: Train = 14.47%, Test = 9.20%

## 2. Label Engineering & Boundaries Overlap

Percentile-based thresholds are computed dynamically on training data to partition records into Low, Medium, High, and Extreme classes:

- **Percentile Thresholds (P25, P75, P95)**: `[0.7093, 1.7858, 3.6208]`

- **Mean Impact Component Values per Class (Train Set)**:
  - **Low** (N=3454):
    - Mean Deaths: 15.96
    - Mean Affected: 12.17
    - Mean Damage (USD): $173.71
  - **Medium** (N=6698):
    - Mean Deaths: 27.59
    - Mean Affected: 12429.99
    - Mean Damage (USD): $4,188,469.84
  - **High** (N=2582):
    - Mean Deaths: 75.46
    - Mean Affected: 350331.24
    - Mean Damage (USD): $411,193,201.01
  - **Extreme** (N=697):
    - Mean Deaths: 1541.94
    - Mean Affected: 4012932.08
    - Mean Damage (USD): $4,044,700,509.33

## 3. Confusion Matrix (Baseline Model)

The table below shows the baseline LightGBM classifier predictions vs actual targets on the chronological test set:

| Actual \ Predicted | Low | Medium | High | Extreme |
| :--- | :---: | :---: | :---: | :---: |
| **Low** | 336 | 221 | 124 | 43 |
| **Medium** | 488 | 622 | 440 | 150 |
| **High** | 77 | 156 | 417 | 143 |
| **Extreme** | 9 | 21 | 52 | 59 |

## 4. Feature Importance Analysis

The splits used by the tree splits inside the baseline LightGBM model:


- **Feature Importances (Split-based)**:
  - `country_encoded`: 3177 splits
  - `magnitude_normalized`: 2825 splits
  - `disasterType_encoded`: 1334 splits
  - `sin_month`: 1261 splits
  - `cos_month`: 1194 splits
  - `subregion_encoded`: 963 splits
  - `disasterSubgroup_encoded`: 677 splits
  - `region_encoded`: 569 splits
  - `iso_encoded`: 0 splits

## 5. Performance Bottlenecks & Recommendations

Based on these diagnostics, we identify the following performance bottlenecks:
1. **Magnitude Data Sparsity**: With ~80% of records missing magnitude, the Z-score is imputed to 0.0, rendering this crucial indicator useless for the vast majority of records. Adding a binary indicator `magnitude_is_missing` will allow the model to differentiate imputed vs actual values.
2. **Category Target Overlap**: Smoothed target encoding on `severityScore` maps categories to a single dimension, losing class boundaries. We need to introduce independent target encodings for each of the core impact components: `deaths`, `totalAffected`, and `economicDamageUSD`.
3. **Missing Hazard frequency & Vulnerability**: High-cardinality locations (countries, regions) are encoded solely using targets. Adding historical frequencies (e.g. disaster counts per country) and country-specific vulnerability indicators (average historical deaths per disaster type) will provide the model with baseline priors.
4. **Imbalance Constraints**: The default class weight is balanced, but the model has very low precision on `Extreme` class. We need to test different sample weights, hyperparameter tunings, and model formulations (such as Regressor-to-Classification mapping).
