# Feature Catalog Mapping Document
## Project: AI Disaster Intelligence & Decision Support Platform

This catalog lists the mapping of raw fields from the EM-DAT CSV dataset to engineered features used by our machine learning models.

---

## 1. Geographical Features Category

Geographical features capture the spatial context and vulnerability profile of the location where the disaster occurred.

| Raw EM-DAT Column | Target ML Feature | Data Type | Engineering Transformation | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **`ISO`** | `iso_encoded` | Float | Target Encoding (casualty-weighted mapping). | Captures country-level baseline infrastructural resilience. |
| **`Country`** | `country_encoded` | Float | Target Encoding or Native Categorical code. | Alternative baseline mapping for GBDTs. |
| **`Subregion`** | `subregion_encoded` | Float | Target Encoding (frequency and damage-weighted mapping). | Resolves regional clusters (e.g., Caribbean vulnerability to cyclones). |
| **`Region`** | `region_one_hot` | Vector (binary) | One-Hot Encoding. | Low-cardinality indicator for continent-level baseline partitions. |
| **`Latitude`** / **`Longitude`** | `centroid_latitude` / `centroid_longitude` | Float | **Centroid Fallback Imputation**: If coordinates are missing (89% cases), resolve using country/state centroid constants. | Inputs for geospatial distance matrices and regional coordinates maps. |
| **`Admin Units`** / **`GADM Admin Units`** | `admin_level_code` | Categorical | Extract GADM unique identifiers if present. | Identifies sub-national localized boundaries. |

---

## 2. Temporal Features Category

Temporal features capture the chronological trend, climate shifts, and cyclic seasonality of disaster occurrences.

| Raw EM-DAT Column | Target ML Feature | Data Type | Engineering Transformation | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **`Start Year`** | `start_year_scaled` | Float | Min-Max scaling or raw integer index. | Captures long-term multi-decadal frequencies (e.g., climate change indicators). |
| **`Start Month`** | `month_sin` / `month_cos` | Float / Float | **Cyclical Transformation**: <br> $M_{sin} = \sin(2\pi \cdot M / 12)$ <br> $M_{cos} = \cos(2\pi \cdot M / 12)$ | Captures periodic seasonal patterns (e.g., monsoon and tropical storm windows). |
| **`Start Day`** / **`End Day`** | `disaster_duration_days` | Integer | Calculated duration: `EndDate - StartDate` (default to 1 if null). | Long-duration disasters (e.g., droughts, epidemics) scale impacts differently than flash events. |

---

## 3. Disaster Features Category

Disaster characteristics profile the physical hazard class, scale, and cascading triggers.

| Raw EM-DAT Column | Target ML Feature | Data Type | Engineering Transformation | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **`Disaster Group`** | `group_one_hot` | Vector (binary) | One-Hot Encoding (Natural / Technological). | High-level split separating weather/earthquakes from industrial failures. |
| **`Disaster Subgroup`** | `subgroup_encoded` | Float | Target Encoding. | Categorical split (Meteorological, Hydrological, Geophysical, etc.). |
| **`Disaster Type`** | `type_native` | Categorical | Pass directly to GBDTs as native categories (LightGBM). | Primary indicator determining model splits and magnitude scalers. |
| **`Disaster Subtype`** | `subtype_encoded` | Float | Target Encoding. | High-resolution categorical split (e.g., Ground movement vs. Tsunami). |
| **`Magnitude`** | `Normalized_Magnitude` | Float | **Group-Wise Scaling**: <br> $M_{norm} = (M - \mu_{type}) / \sigma_{type}$ | Standardizes Richter scales, wind speeds, and flood areas into a uniform scale. |
| **`Magnitude Scale`** | `scale_one_hot` | Vector (binary) | One-Hot Encoding. | Identifies the physical scale unit mapping to standard scales. |
| **`Associated Types`** | `has_secondary_flood` <br> `has_secondary_landslide` <br> `has_secondary_fire` | Binary (0 / 1) | String parsing of text list separators (`"Flood\|Slide"`). | Identifies cascading hazard risks. |

---

## 4. Impact Features Category (Targets & Intermediate metrics)

Captures casualties, displacements, and final severity categories.

| Raw EM-DAT Column | Target ML Feature | Data Type | Engineering Transformation | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **`Total Deaths`** | `log_deaths` | Float | **Target log transform**: $\ln(\text{Deaths} + 1)$. | Regression Target: Casualties count (right-skewed). |
| **`No. Injured`** / **`No. Affected`** / **`No. Homeless`** | `log_affected_components` | Float | Embedded individually within database models. | Auxiliary targets indicating displacement categories. |
| **`Total Affected`** | `log_total_affected` | Float | **Target log transform**: $\ln(\text{Affected} + 1)$. | Regression Target: Total population displaced or injured. |
| *Composite Derived Metric* | `Severity_Class` | Ordinal | Calculated weighted percentile categorizations (Low, Medium, High, Extreme). | Multiclass Classification Target. |

---

## 5. Economic Features Category

Captures inflation scales, damages, and funding metrics.

| Raw EM-DAT Column | Target ML Feature | Data Type | Engineering Transformation | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **`Total Damage ('000 US$)`** | `log_damage_raw` | Float | $\ln(\text{Damage} + 1)$. | Raw target (historical value). |
| **`Total Damage, Adjusted ('000 US$)`** | `log_damage_adjusted` | Float | **Target log transform**: $\ln(\text{Damage\_Adjusted} + 1)$. | Regression Target: Adjusted economic losses in thousands USD (80% missing). |
| **`CPI`** | `cpi_scaled` | Float | Robust scaling. | Captures inflation scales to normalize values across decades. |
| **`Reconstruction Costs`** | `reconstruction_cost_log` | Float | $\ln(\text{Reconstruction} + 1)$. | Auxiliary target. |
| **`AID Contribution ('000 US$)`** | `aid_cont_log` | Float | $\ln(\text{AID} + 1)$. | Input or target predicting international coordination metrics. |
