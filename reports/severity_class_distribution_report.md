# Severity Class Distribution Report
## Project: AI Disaster Intelligence & Decision Support Platform

This report details the statistical distribution, score ranges, and characteristic profiles of the disaster events classified into ordinal severity classes (Low, Medium, High, Extreme) using the EM-DAT (2000-2026) records.

---

## 1. Severity Class Distribution Summary

The composite severity index $S_i$ was calculated for all **16,853** historical events using the weighted log-transformed targets formula:

$$S_i = 0.4 \cdot \log_{10}(\text{Deaths}_i + 1) + 0.3 \cdot \log_{10}(\text{TotalAffected}_i + 1) + 0.3 \cdot \log_{10}(\text{DamageAdjusted}_i + 1)$$

Applying the percentile boundaries ($P_{25} = 0.7199$, $P_{75} = 1.8125$, $P_{95} = 3.5907$) yields the following dataset splits:

| Severity Class | Score Range | Historical Event Count | Percentage of Dataset (%) | Typical Response Level |
| :--- | :--- | :--- | :--- | :--- |
| **Low** | $S_i \le 0.7199$ | 4,216 | 25.02% | Local Municipal / First Responders |
| **Medium** | $0.7199 < S_i \le 1.8125$ | 8,424 | 49.98% | State / Regional Coordination |
| **High** | $1.8125 < S_i \le 3.5907$ | 3,370 | 20.00% | National Emergency Agency |
| **Extreme** | $S_i > 3.5907$ | 843 | 5.00% | International Aid / NGO Coalition |
| **Total** | **0.00 to 6.71** | **16,853** | **100.00%** | |

---

## 2. Severity Class Characteristic Profiles

### 2.1 Low Severity ($S_i \le 0.72$)
* **Profile**: Localized incidents with zero to minimal casualties and minimal economic footprint.
* **Examples**: Minor transport accidents, short-duration localized convective storms, and small industrial fire outbreaks.
* **Casualties range**: typically 0–2 deaths; $<100$ people affected.

### 2.2 Medium Severity ($0.72 < S_i \le 1.81$)
* **Profile**: Regional events requiring coordinated local responses.
* **Examples**: Regular seasonal riverine flooding, moderate earthquakes (magnitude 5.0–5.9) with minor structural failure, and regional localized epidemics.
* **Casualties range**: typically 1–15 deaths; $500$ to $20,000$ people affected.

### 2.3 High Severity ($1.81 < S_i \le 3.59$)
* **Profile**: Substantial natural disasters causing structural destruction over large administrative boundaries.
* **Examples**: Category 3–4 hurricanes/cyclones, severe earthquakes (magnitude 6.0–6.9) in populated regions, and multi-province droughts.
* **Casualties range**: typically 10–200 deaths; $50,000$ to $500,000$ people affected; economic damages in the range of tens of millions USD.

### 2.4 Extreme Severity ($S_i > 3.59$)
* **Profile**: Catastrophic crises triggering massive infrastructure collapse, high mortality, and widespread displacement.
* **Examples**: The 2004 Indian Ocean Tsunami, Major hurricanes making direct landfalls (e.g. Hurricane Katrina), massive earthquakes (e.g. 2010 Haiti), or extreme multi-year droughts affecting millions of agricultural workers.
* **Casualties range**: Hundreds to thousands of deaths; millions displaced; damages exceeding hundreds of millions USD.

---

## 3. Modeling Recommendations for Severity Classification

1. **Handling Class Imbalance**:
   * Extreme class instances represent only **5%** of the dataset, while High represents **20%**. 
   * To prevent the LightGBM classifier from ignoring the critical Extreme class, we must train using **class-weighted log-loss** (by setting `class_weight='balanced'` in LightGBM) or apply focal loss to penalize misclassifications of extreme events.
2. **Feature Mapping Guidance**:
   * Models should prioritize engineered categorical targets like `subregion_encoded` and cyclical temporal coordinates to detect high-vulnerability periods.
3. **Threshold Stability**:
   * These thresholds ($0.7199, 1.8125, 3.5907$) must be coded as static constants within the FastAPI API schemas to ensure predictions are mapped consistently with EMDAT historical distributions.
