# Model Evaluation Report
**Date Generated**: 2026-06-18 20:56:18  
**Phase**: Phase 2: Machine Learning Foundation  

---

## 1. Executive Summary: Severity Classification

A LightGBM classifier was trained to classify disasters into four ordinal classes: `Low`, `Medium`, `High`, and `Extreme` based on chronological splits (Train: 2000-2020, Test: 2020-2026).

| Evaluation Metric | Value |
| :--- | :---: |
| **Overall Accuracy** | 42.38% |
| **F1-Macro Score** | 0.3835 |
| **F1-Weighted Score** | 0.4335 |
| **Total Test Records** | 3,358 |

---

## 2. Classification Performance Report

| Severity Class | Precision | Recall | F1-Score | Support |
| :--- | :---: | :---: | :---: | :---: |
| **Low** | 0.3690 | 0.4572 | 0.4084 | 724.0 |
| **Medium** | 0.5941 | 0.3694 | 0.4556 | 1,700.0 |
| **High** | 0.3957 | 0.5120 | 0.4464 | 793.0 |
| **Extreme** | 0.1534 | 0.4113 | 0.2235 | 141.0 |

---

## 3. Analysis & Key Insights
1. **Recall on Extreme Class**: The model successfully flags `Extreme` events with **41% recall** using only category and magnitude parameters. This is highly valuable as baseline indicators, considering impact values (deaths, affected) are missing at inference.
2. **Category Splits**: LightGBM utilizes target-encoded location means and group-wise Z-score normalized magnitudes to establish boundaries between categories. Standardizing magnitudes per disaster type ensures cyclone wind speeds do not corrupt flood classifications.
3. **Log-Scaling & Balance**: Setting balanced class weights helped compensate for historical class skewness (Extreme represents only ~4% of test records).
