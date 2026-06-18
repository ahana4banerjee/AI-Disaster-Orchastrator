# Model Evaluation & Optimization Report
**Date Generated**: 2026-06-18 21:30:15  
**Phase**: Phase 2: Machine Learning Foundation - Performance Optimization  

---

## 1. Executive Summary: The Derived Severity Pipeline

Rather than classifying severity using a black-box multiclass model, we implemented a **Derived Severity Pipeline** utilizing multi-output CatBoost Regressors. This pipeline:
1. Predicts the three log-scale impact components of a disaster: $\log_{10}(\text{deaths} + 1)$, $\log_{10}(\text{affected} + 1)$, and $\log_{10}(\text{damage\_thousands} + 1)$.
2. Combines them deterministically using the platform's severity score formula:
   $$S_i = 0.4 \log_{10}(\text{deaths} + 1) + 0.3 \log_{10}(\text{affected} + 1) + 0.3 \log_{10}(\text{damage} + 1)$$
3. Segments the score into `Low`, `Medium`, `High`, and `Extreme` severity classes using dynamic percentile thresholds fitted on the training set's derived predictions.

This architecture achieves the highest classification Macro F1 score on the chronological test set (**0.4375**) and provides granular, explainable predictions of casualties and financial damage.

---

## 2. Comparison of Modeling Approaches

The table below shows the performance of all tested models on the held-out chronological test set (Train: 2000–2020, Test: 2020–2026):

| Model Formulation | Classifier/Regressor | Test Accuracy | Test Macro F1 | Extreme Recall | Extreme Precision |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Multiclass Direct** | LightGBM | 43.90% | 0.3943 | 43.26% | 16.94% |
| **Multiclass Direct** | XGBoost | 44.34% | 0.4020 | 53.19% | 16.13% |
| **Multiclass Direct** | CatBoost | 40.29% | 0.3780 | 51.06% | 15.69% |
| **Direct Regression + Dynamic** | LightGBM | 51.28% | 0.4166 | 36.17% | 23.83% |
| **Direct Regression + Dynamic** | XGBoost | 48.93% | 0.4225 | 36.17% | 23.29% |
| **Direct Regression + Dynamic** | CatBoost | 50.77% | 0.4293 | 21.28% | 28.57% |
| **Derived Severity Pipeline (OOF)** | CatBoost (Multi) | **52.83%** | **0.4375** | **27.66%** | **27.27%** |
| **Derived Severity Pipeline (OOF)** | XGBoost (Multi) | 50.24% | 0.4223 | 34.04% | 21.52% |
| **Derived Severity Pipeline (OOF)** | LightGBM (Multi) | 51.16% | 0.4135 | 30.50% | 22.75% |

### Key Findings
1. **Regression Superiority**: Continuous regression formulations consistently outperform direct multiclass classifiers. The direct multiclass models suffer from extremely low precision on the `Extreme` class (~16%), over-predicting rare severe disasters and generating a high false alarm rate.
2. **Derived Pipeline Advantages**: The derived pipeline (CatBoost Multi-Output) achieves the best overall performance, elevating Test F1-Macro to **0.4375** and Accuracy to **52.83%**, while maintaining a balanced precision and recall of **27.27%** and **27.66%** respectively on the `Extreme` class.

---

## 3. Confusion Matrix: Final Production Model (CatBoost Derived Pipeline)

The confusion matrix below shows the predicted versus actual severity classes on the 3,358 test records:

| Actual \ Predicted | Low | Medium | High | Extreme |
| :--- | :---: | :---: | :---: | :---: |
| **Low** (N=724) | **229** | 420 | 62 | 13 |
| **Medium** (N=1700) | 247 | **1126** | 302 | 25 |
| **High** (N=793) | 2 | 345 | **380** | 66 |
| **Extreme** (N=141) | 1 | 32 | 69 | **39** |

*Analysis*: The derived pipeline maintains a tight ordinal diagonal. It rarely makes severe misclassifications (e.g. predicting Low for an Extreme disaster happens only once out of 141 events, and predicting Extreme for a Low event happens only 13 times out of 724 events).

---

## 4. Feature Importance Analysis

Feature importances (split-based counts) for the three underlying CatBoost regressors:

### 1. Casualties Model (`deaths`)
- `disasterType_encoded`: **33.05%**
- `disasterSubgroup_encoded`: **12.01%**
- `duration_days`: **10.01%**
- `magnitude_normalized`: **8.44%**
- `latitude` / `longitude`: **15.67%** (cumulative)

### 2. Affected Population Model (`affected`)
- `disasterType_encoded`: **39.41%**
- `duration_days`: **13.28%**
- `longitude` / `latitude`: **15.71%** (cumulative)
- `abs_latitude`: **6.96%**

### 3. Financial Damages Model (`damage`)
- `disasterType_encoded`: **30.10%**
- `duration_days`: **10.93%**
- `iso_encoded`: **9.90%**
- `abs_latitude`: **8.46%**
- `magnitude_normalized`: **8.45%**

---

## 5. Final Recommendations

We recommend deploying the **Derived Severity Pipeline** wrapping three CatBoost regressors (`DerivedSeverityClassifier`) for production:
1. **Explainability**: Predicts individual outcomes (deaths, affected pop, property damage) which can be visualized directly on the operator interface.
2. **Unified Architecture**: Solves both impact regression (roadmap success criteria) and severity classification in a single pipeline, reducing system complexity.
3. **Target Leakage Prevention**: Integrating out-of-fold target encoding inside `DisasterPreprocessor` stabilizes training and prevents overfitting to historical locations.
