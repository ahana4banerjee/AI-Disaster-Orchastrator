# EM-DAT Schema Analysis Report
## Project: AI Disaster Intelligence & Decision Support Platform

This report outlines the structural analysis of the primary EM-DAT CSV dataset (`data/raw/public_emdat_custom_request_2026-06-16_b4cec7bb-ec36-4c87-9762-f7cc13e97076.csv`). The dataset contains **16,853** disaster event records from **2000 to 2026**.

---

## 1. Column Profiles & Missingness Statistics

The table below lists all 47 columns present in the dataset, their inferred standard data type, the count and percentage of missing values, and the number of unique records:

| Column Name | Inferred Type | Null Count | Null % | Unique Count | Classification / Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`DisNo.`** | string | 0 | 0.00% | 16,853 | Unique Identifier (Index Key) |
| **`Historic`** | string | 0 | 0.00% | 1 | Constant Value (Ignore) |
| **`Classification Key`** | string | 0 | 0.00% | 63 | Categorical Identifier |
| **`Disaster Group`** | string | 0 | 0.00% | 2 | Categorical Feature (Natural / Tech) |
| **`Disaster Subgroup`** | string | 0 | 0.00% | 9 | Categorical Feature |
| **`Disaster Type`** | string | 0 | 0.00% | 31 | Categorical Feature (Primary Type) |
| **`Disaster Subtype`** | string | 0 | 0.00% | 63 | Categorical Feature (Subtype) |
| **`External IDs`** | string | 12,474 | 74.02% | 3,249 | External Metadata (GLIDE / Partner keys) |
| **`Event Name`** | string | 11,518 | 68.34% | 2,243 | Identifier Metadata (e.g. Cyclone Rita) |
| **`ISO`** | string | 0 | 0.00% | 223 | Categorical Feature (3-letter country key) |
| **`Country`** | string | 0 | 0.00% | 223 | Categorical Feature |
| **`Subregion`** | string | 0 | 0.00% | 17 | Categorical Feature |
| **`Region`** | string | 0 | 0.00% | 5 | Categorical Feature |
| **`Location`** | string | 797 | 4.73% | 14,416 | Categorical Metadata (Specific Cities/States) |
| **`Origin`** | string | 12,533 | 74.37% | 845 | Text/Categorical (Trigger factor, e.g. heavy rain) |
| **`Associated Types`** | string | 13,161 | 78.09% | 140 | Categorical (Secondary hazards list) |
| **`OFDA/BHA Response`** | string | 0 | 0.00% | 2 | Boolean Flag (Yes/No response indicator) |
| **`Appeal`** | string | 0 | 0.00% | 2 | Boolean Flag (Yes/No appeal requested) |
| **`Declaration`** | string | 0 | 0.00% | 2 | Boolean Flag (Yes/No declaration issued) |
| **`AID Contribution ('000 US$)`**| int | 16,364 | 97.10% | 428 | Continuous Target (Foreign aid values) |
| **`Magnitude`** | float | 13,461 | 79.87% | 1,611 | Continuous Feature (Primary hazard scale) |
| **`Magnitude Scale`** | string | 6,264 | 37.17% | 6 | Categorical Feature (Indicates scale unit) |
| **`Latitude`** | float | 14,999 | 89.00% | 1,648 | Geospatial Coordinate (Y-axis) |
| **`Longitude`** | float | 14,999 | 89.00% | 1,644 | Geospatial Coordinate (X-axis) |
| **`River Basin`** | string | 15,507 | 92.01% | 1,276 | Geospatial Metadata (Hydrological zone) |
| **`Start Year`** | int | 0 | 0.00% | 27 | Temporal Feature |
| **`Start Month`** | int | 74 | 0.44% | 12 | Temporal Feature (Cyclical seasonality) |
| **`Start Day`** | int | 1,592 | 9.45% | 31 | Temporal Feature |
| **`End Year`** | int | 0 | 0.00% | 28 | Temporal Feature |
| **`End Month`** | int | 171 | 1.01% | 12 | Temporal Feature |
| **`End Day`** | int | 1,507 | 8.94% | 31 | Temporal Feature |
| **`Total Deaths`** | int | 3,276 | 19.44% | 598 | Continuous Target (Casualty regression) |
| **`No. Injured`** | int | 10,516 | 62.40% | 720 | Continuous Target (Casualty regression) |
| **`No. Affected`** | int | 9,010 | 53.46% | 3,324 | Continuous Target (Casualty regression) |
| **`No. Homeless`** | int | 15,495 | 91.94% | 595 | Continuous Target (Casualty regression) |
| **`Total Affected`** | int | 4,262 | 25.29% | 4,530 | Continuous Target (Casualty regression) |
| **`Reconstruction Costs`** | int | 16,819 | 99.80% | 32 | Continuous Target (Economic cost) |
| **`Reconstruction Costs, Adj.`** | int | 16,819 | 99.80% | 33 | Continuous Target (Economic cost) |
| **`Insured Damage`** | float | 16,132 | 95.72% | 286 | Continuous Target (Economic cost) |
| **`Insured Damage, Adjusted`** | int | 16,132 | 95.72% | 586 | Continuous Target (Economic cost) |
| **`Total Damage ('000 US$)`** | float | 13,526 | 80.26% | 1,090 | Continuous Target (Raw damages) |
| **`Total Damage, Adj.`** | int | 13,540 | 80.34% | 2,414 | Continuous Target (Primary economic loss) |
| **`CPI`** | float | 156 | 0.93% | 26 | Continuous Feature (Consumer Price Index) |
| **`Admin Units`** | string | 8,459 | 50.19% | 6,898 | Geospatial Metadata (JSON administrative tags) |
| **`GADM Admin Units`** | string | 9,022 | 53.53% | 6,446 | Geospatial Metadata (JSON GADM border codes) |
| **`Entry Date`** | string | 0 | 0.00% | 2,721 | System Metadata |
| **`Last Update`** | string | 0 | 0.00% | 303 | System Metadata |

---

## 2. Candidate Feature Categories

To organize these attributes for modeling inside `ML_DESIGN.md`, we categorize them into distinct functional groups:

### 2.1 Identifier Columns (Non-Predictive metadata)
* `DisNo.` (Unique primary key)
* `External IDs`, `Event Name`, `Entry Date`, `Last Update`

### 2.2 Categorical Features (Predictors)
* **High-Cardinality**: `Country` (223 unique), `ISO` (223 unique), `Location` (14,416 unique).
* **Low-Cardinality**: `Disaster Group` (2 unique), `Disaster Subgroup` (9 unique), `Disaster Type` (31 unique), `Disaster Subtype` (63 unique), `Region` (5 unique), `Subregion` (17 unique), `Magnitude Scale` (6 unique).
* **Binary Flags**: `OFDA/BHA Response`, `Appeal`, `Declaration`.

### 2.3 Continuous Numerical Features (Predictors)
* `Magnitude` (Represents Richter scale, Kph wind speed, or flood Km2 depending on Scale).
* `CPI` (Used as inflation denominator scaling context).

### 2.4 Geospatial Features (Predictors / Filtering)
* `Latitude`, `Longitude` (Physical centroids).
* `GADM Admin Units`, `Admin Units` (Used to map sub-national boundaries).

### 2.5 Temporal Features (Seasonality / Baseline shifts)
* `Start Year`, `Start Month`, `Start Day`
* `End Year`, `End Month`, `End Day`

### 2.6 Target Variables (Supervised Outputs)
* **Mortality**: `Total Deaths` (19.4% missing).
* **Affected Population**: `Total Affected` (25.3% missing), computed from raw components `No. Affected`, `No. Injured`, `No. Homeless`.
* **Economic Damages**: `Total Damage, Adjusted ('000 US$)` (80.3% missing).

---

## 3. Key Data Challenges & Modeling Rationale

The profiling results highlight critical database properties that dictate our machine learning strategy:

1. **Severe Missingness in Coordinates (89% Nulls)**:
   * **Challenge**: Latitude and Longitude coordinates are missing for 89% of events.
   * **Resolution**: We cannot rely on dense latitude/longitude coordinates as primary inputs. Models must train on target-encoded `Subregion`, `Region`, and `ISO` (Country) categorical features. Missing coordinates are resolved using the country centroid fallback during inference.
2. **Economic Damage Sparsity (80.3% Nulls)**:
   * **Challenge**: The target variable `Total Damage, Adjusted ('000 US$)` is missing for 80% of events.
   * **Resolution**: Standard regression algorithms will fail if nulls are treated as zero. We apply iterative predictive imputation (Section 10 of `ML_DESIGN.md`) or train models specifically on the subset of records where damages are populated, falling back to geographic averages.
3. **Magnitude Incompatibility (79.8% Nulls & 6 Scales)**:
   * **Challenge**: Magnitudes are missing in 79.8% of cases, and the scale shifts meaning entirely between disaster types.
   * **Resolution**: We normalize magnitude metrics (`Normalized_Magnitude`) relative to each `Disaster Type` group mean and standard deviation to form a uniform predictor scale.
