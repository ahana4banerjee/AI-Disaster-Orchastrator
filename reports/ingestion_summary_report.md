# EM-DAT Data Ingestion & Cleaning Pipeline Summary Report
## Project: AI Disaster Intelligence & Decision Support Platform
**Date**: 2026-06-18  
**Phase**: Phase 1: Data Ingestion & Pipeline

---

## 1. Ingestion Summary

The data ingestion engine processed the raw historical EM-DAT CSV file and successfully populated the MongoDB Atlas cluster. Below is the ingestion breakdown:

| Metric | Record Count | Percentage of Total |
| :--- | :---: | :---: |
| **Total Raw CSV Rows Read** | 16,853 | 100.00% |
| **Cleaned Records Inserted / Upserted** | 16,789 | 99.62% |
| **Skipped / Dropped Records** | 64 | 0.38% |

### Breakdown of Skipped Records:
* **Pre-2000 Historical Records (Dropped)**: **60** records. These were filtered out to maintain high multi-decadal data quality (as historical pre-2000 disaster reporting was inconsistent and prone to significant omissions). This includes anomalous records with typos like `1988-0424-VEN`, which listed a `Start Year` of `2026` but had an `End Year` of `1988` and a `1988` ID prefix.
* **Chronologically Inverted Dates (Dropped)**: **4** records. Records where the parsed `endDate` was prior to `startDate` due to database typing or transcription errors were dropped to preserve timeline integrity.

---

## 2. Correction and Imputation Statistics

Disaster records are highly sparse, particularly across impact metrics and coordinates. The pipeline resolved these gaps using the following cleaning rules:

### A. Total Deaths Zero-Imputations
A missing death count in historical emergency databases usually implies no registered casualties.
* **Imputed Deaths (`deaths_is_missing: true`)**: **2,060** records (**12.27%** of inserted records). These records had missing deaths imputed to `0` and were flagged for machine learning pipeline accounting.
* **Explicit Deaths (`deaths_is_missing: false`)**: **14,729** records (**87.73%** of inserted records). These records contained explicitly recorded death statistics.

### B. Coordinate Fallback Imputations (Geospatial Centroids)
Coordinates are missing in 89% of historical records. The pipeline resolves locations using dynamic lookups.
* **Imputed Coordinates (Centroid Fallback)**: **14,969** records (**89.16%** of inserted records). Resolved using the country-level ISO centroid mapping catalog.
* **Explicit Coordinates (GPS Logged)**: **1,820** records (**10.84%** of inserted records). Kept the precise logged coordinates from the raw CSV data.

### C. Total Affected Population Calculations
* For records missing an explicit `Total Affected` figure, the pipeline dynamically calculated the aggregate sum of component populations:
  $$\text{Total Affected} = \text{No. Injured} + \text{No. Affected} + \text{No. Homeless}$$
* Normalized empty string inputs (`""`) to `None` for optional fields to prevent validation parsing errors.
* Multiplied inflation-adjusted damages (originally in thousands of USD) by 1,000 to save the raw value in USD.

---

## 3. Index and Database Integrity

Collection indexes were successfully built to optimize query pathways and enforce constraints:

| Index Name | Collection | Keys | Index Type | Optimization Goal |
| :--- | :--- | :--- | :--- | :--- |
| `_id_` | `disaster_records` | `_id: 1` | Primary Key | Default document identifier |
| `geoJSON_2dsphere` | `disaster_records` | `geoJSON: "2dsphere"` | Geospatial | Accelerates geographical coordinates search |
| `country_disasterType_startDate_compound` | `disaster_records` | `country: 1, disasterType: 1, startDate: -1` | Compound | Speeds up analytical filter dropdown queries |
| `email_unique` | `users` | `email: 1` | Unique Single | Enforces email constraints and fast logins |
| `expiresAt_ttl` | `analytics_cache` | `expiresAt: 1` | TTL | Automatically purges expired cache views |

---

## 4. Key Takeaways
1. **Idempotency**: The ingestion pipeline uses `ReplaceOne` operators with `upsert=True` mapped to unique EM-DAT IDs (`disNo`), allowing consecutive runs to refresh database data without duplicate collection clutter.
2. **ML Generalizability**: Imputing coordinates and categorizing records dynamically into Low, Medium, High, and Extreme classes yields clean, structured targets, laying a robust foundation for Phase 2 modeling.
3. **Data Conformity**: 100% of transformed documents inserted into MongoDB successfully satisfy Pydantic validations and the database JSON Schema rules.
