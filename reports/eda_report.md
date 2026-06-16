# EM-DAT Exploratory Data Analysis (EDA) Report
## Project: AI Disaster Intelligence & Decision Support Platform

This document presents the detailed exploratory profiling findings calculated from the EM-DAT custom request CSV dataset containing **16853** disaster events (2000-2026).

---

## 1. Missing Values Profile

Missing rates across key numerical fields determine our database imputation features:

* **Magnitude**: 79.87% missing.
* **Total Deaths**: 19.44% missing.
* **Total Affected**: 25.29% missing.
* **Total Damage**: 80.34% missing.

*Visual Plot Reference*: [plots/eda/01_missing_values.png](../plots/plots/eda/01_missing_values.png)

---

## 2. Numerical Target Distributions

Highly right-skewed outcomes dictate models scaling requirements:
* **Log-Transform Requirements**: Skewness coefficients for deaths and adjusted damage variables exceed **3.0**. Natural logarithmic scale operations must be applied to regression targets before feeding tree structures to stabilize gradient trees splits.

*Visual Plot Reference*: [plots/eda/02_numerical_distributions.png](../plots/plots/eda/02_numerical_distributions.png)

---

## 3. Correlation Matrices Heatmap

Spearman rank-based coefficients evaluate ordinal relationships:
* The rank correlations indicate moderate relationships between magnitude scales and casualties, but very low linear correlation directly, verifying the need for non-linear decision tree algorithms (XGBoost/LightGBM).

*Visual Plot Reference*: [plots/eda/03_correlation_heatmap.png](../plots/plots/eda/03_correlation_heatmap.png)

---

## 4. Disaster Frequencies & Regional Hazards

Categorical occurrences profile local risks:
* **Top Disaster Type**: Flood (with 4273 historical events).
* **Most Affected Region**: Asia (with 6797 historical events).
* **Top Country Frequency**: China (with 1381 records).

*Visual Plot References*:
* [Disaster Type Distribution](../plots/plots/eda/04_disaster_type_distribution.png)
* [Year-Wise Trend](../plots/plots/eda/05_year_wise_trend.png)
* [Country-Wise Frequency](../plots/plots/eda/06_country_wise_frequency.png)

---

## 5. Severity Index Classifications

Ordinal severity classes (Low, Medium, High, Extreme) derived from composite calculations:
* **Severity Counts**:
  * **Low**: 4216 events
  * **Medium**: 8424 events
  * **High**: 3370 events
  * **Extreme**: 843 events

*Visual Plot References*:
* [Severity Class Distribution](../plots/plots/eda/09_severity_class_distribution.png)
* [Severity vs Disaster Type](../plots/plots/eda/10_severity_vs_disaster_type.png)

---

## 6. Seasonality & Geolocation Map

Temporal and geospatial profiles:
* **Seasonality peak**: Month 1.0 represents the seasonal peak event count.
* **Coordinates Density**: Centroid approximations are essential since 89% of Latitude/Longitude pairs are null.

*Visual Plot References*:
* [Month-wise Seasonality](../plots/plots/eda/11_month_wise_seasonality.png)
* [Global Coordinates Map](../plots/plots/eda/12_global_disaster_map.png)

---

## 7. Modeling Takeaways

1. **Group-Wise Magnitude Scaler**: Group-wise magnitude standardizations must be coded due to unit differences across disaster types.
2. **Missing Coordinates Centroid Fallback**: Lat/long centroid references must be mapped to ISO keys.
3. **Log Target Scaling**: XGBoost regression models will train on $\log_e(y + 1)$ metrics to secure convergence boundaries.
