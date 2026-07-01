# Master Project Context Document
## AI Disaster Intelligence & Decision Support Platform

This document preserves the comprehensive project state, engineering decisions, implemented scaffolding, dataset insights, challenges resolved, and future phase execution guidelines. Read this file to onboard instantly and execute subsequent phases.

---

## 1. Project Overview & Tech Stack

The platform is designed to assist **Disaster Management Authorities (Admins)** with operational crisis coordination and **Citizens (Public)** with regional preparedness lookups.

### Target Dataset
* **Source**: EM-DAT Global Disaster Database (2000-2026).
* **Records Count**: 16,789 records successfully cleaned and ingested into MongoDB Atlas from 16,853 raw entries.
* **Attributes**: Disaster Type/Subtype, Country/Region/Subregion, Magnitude/Scale, Lat/Long coordinates, Start/End timelines, and Impact Metrics (Deaths, Injured, Affected, Homeless, Adjusted Economic Damages).

### Core Stack
* **Frontend**: React (TypeScript) + Next.js (Router layouts) + Tailwind CSS.
* **Backend**: FastAPI (Python asynchronous endpoints) + Uvicorn server processes.
* **Database**: MongoDB Atlas Cluster + Redis Cache.
* **Machine Learning**: LightGBM (severity classification), XGBoost (impact regression), Cosine Similarity KNN (analog search), K-Means (risk profiling).

---

### 2. Engineering Decisions (How & Why)

1. **Clean-Sheet Restructure**:
   * *What*: We deleted all pre-existing folders and rebuilt the directory scaffolding from scratch.
   * *Why*: The original code used tightly coupled, non-scalable layouts. A modular layout isolates API routers, ML inference boundaries, and Next.js frontend screens, facilitating Docker containerization.
2. **Tabular-First ML Stack (No Deep Learning)**:
   * *What*: We configured LightGBM and XGBoost tree-based ensembles.
   * *Why*: EM-DAT consists of ~16,800 sparse tabular records. Deep learning tabular models overfit on datasets of this size and skewness. Decision tree models handle tabular splits much faster and integrate with SHAP explainability.
3. **Pre-Aggregated Caching (Redis + MongoDB)**:
   * *What*: Created an `analytics_cache` collection in MongoDB and designed a Redis caching middleware.
   * *Why*: Complex temporal and geographical aggregations on the EM-DAT database degrade query latencies. Pre-calculating dashboard statistics every 24 hours keeps client loading speeds under 5ms.
4. **Geospatial & Compound Indexing**:
   * *What*: Structured a `2dsphere` index on `geoJSON` fields and compound indexes on `{ country: 1, disasterType: 1 }`.
   * *Why*: Accelerates radius queries for the Public "Nearby Disaster Explorer" and speeds up dashboard categorical filtering.
5. **Idempotent Bulk Writes (Motor ReplaceOne)**:
   * *What*: Ingestion uses Motor `bulk_write` with `ReplaceOne` operators mapping matching `disNo` fields with `upsert=True`.
   * *Why*: Guarantees absolute ingestion idempotency, letting the ingestion pipeline rerun at any point to synchronize data updates without producing duplicate records.
6. **Pre-Validators & Centroid Mapping**:
   * *What*: Used Pydantic `@model_validator(mode="before")` inside schemas to resolve deaths imputation and geoJSON centroid fallbacks before instantiation.
   * *Why*: Keeps the data-integrity layer tightly bound to database models, guaranteeing zero database pollution from missing parameters.
7. **Derived Severity Pipeline (Multi-Output Regressors)**:
   * *What*: Replaced direct multiclass classification with a derived pipeline that forecasts individual log-scale impact components ($\log_{10}(\text{deaths} + 1)$, $\log_{10}(\text{affected} + 1)$, and $\log_{10}(\text{damage} + 1)$) using XGBoost Regressors, and computes severity score deterministically, thresholded via dynamic percentiles.
   * *Why*: Direct multiclass classification suffers from target imbalance and high variance, predicting the `Extreme` class with very low precision (~16%). Separating the task into physical outcome regressions matches the deterministic definition of severity, provides granular explainability to the user, and achieves a significantly higher test Macro F1 of **0.4446** compared to the baseline LightGBM Classifier (**0.3829**).
8. **Out-of-Fold Target Encoding**:
   * *What*: Implemented custom `KFoldSmoothedTargetEncoder` inside the preprocessing pipeline.
   * *Why*: Avoids severe target leakage by calculating out-of-fold target mappings during model training (`fit_transform`) and applying static mappings during inference (`transform`).
9. **Dynamic Percentile Thresholding**:
   * *What*: Fit class-splitting thresholds on the model's training set derived predictions rather than ground truth targets.
   * *Why*: Continuous regressors suffer from regression-to-the-mean, predicting values closer to intermediate ranges. Fitting thresholds on training predictions preserves class distributions and raises the recall of extreme events.
10. **Analog Search Cosine Similarity KNN**:
    * *What*: Pre-fit standard scaler and `NearestNeighbors` brute-force index over 6 normalized dimensions.
    * *Why*: Serves instant analogue lookups (<5ms) matching query vectors with the 5 closest historical disasters of the same type.
11. **Ordinal K-Means Regional Vulnerability Clustering**:
    * *What*: Grouped subregions into $K=4$ clusters, and sorted cluster centroids ascendingly to map cluster IDs deterministically to ordinal risk tiers (`Low`, `Medium`, `High`, `Extreme`).
    * *Why*: Creates stable, non-random long-term vulnerability profiling stored in read-only MongoDB collections.
12. **EOC/FEMA Design System Alignment**:
    * *What*: Adopted a high-density, flat EOC mission control aesthetic, utilizing Tailwind v4 custom theme mappings mapped to solid color CSS variables.
    * *Why*: Establishes institutional trust and authority, removing generic SaaS startup glassmorphism, neon decorations, and emojis.
13. **Next.js Client-Side Route Guards**:
    * *What*: Mounted authorization hook validation inside the administrative portal layout `admin/layout.tsx`.
    * *Why*: Intercepts unauthenticated sessions and redirects unauthorized browser requests immediately to the `/login` view.
14. **Form URL-Encoded Session Logins**:
    * *What*: Configured the client login handler to dispatch params as `application/x-www-form-urlencoded` parameters.
    * *Why*: Bypasses FastAPI's `OAuth2PasswordRequestForm` 422 parser validation failures when payloads are sent as JSON.
15. **Recharts SSR Hydration Guards**:
    * *What*: Wrapped Recharts components inside stateful client mounting checks (`mounted` check triggered via `useEffect`).
    * *Why*: Prevents Next.js Server-Side Rendering (SSR) hydration mismatches caused by SVG responsive calculations during page collection.

---

## 3. Implemented Scaffolding Map

The directory tree includes the core backend database managers, schemas, loader modules, and administration scripts:

```
├── ARCHITECTURE.md          # Global System Topology, workflows, and deployment specifications
├── ROADMAP.md               # 9-Phase technical project implementation roadmap
├── README.md                # Project entry overview, tech stack, and setup quickstart
├── CONTEXT.md               # Master state-preservation document (This file)
├── docker-compose.yml       # Orchestrates Core Gateway, ML Inference, and Redis containers
├── backend/                 # FastAPI Core Backend orchestrator folder
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── api.py           # Registers gateway endpoints and routing groups
│   │   │       └── endpoints/
│   │   │           ├── analytics.py  # Exposes K-Means regional risk profile lookups
│   │   │           └── predict.py    # Proxies severity predictions to ML Service
│   │   ├── core/
│   │   │   ├── config.py    # Environment settings manager using Pydantic Settings
│   │   │   ├── database.py  # Asynchronous MongoDB motor client lifecycle manager
│   │   │   └── country_centroids.json # Lookup reference containing coordinates for 252 ISO centroids
│   │   ├── models/
│   │   │   └── schemas/
│   │   │       ├── analytics.py # Pydantic v2 schemas validating regional risk profiles
│   │   │       └── disaster.py  # Pydantic database validation schemas and pre-validators
│   │   ├── services/
│   │   │   ├── csv_loader.py     # Memory-efficient chunked CSV streaming reader
│   │   │   ├── data_pipeline.py  # Data cleaning, calculation, and label partition pipeline
│   │   │   └── bulk_ingestion.py # Idempotent motor bulk writing service
│   │   └── main.py
│   └── tests/
│       ├── test_analytics.py       # API integration tests for analytics endpoints (100% pass)
│       └── test_disaster_schema.py # Comprehensive schema validation unit tests (100% pass)
├── ml_service/              # Dedicated ML Microservice folder
│   ├── api/
│   │   └── endpoints/
│   │       ├── predict.py    # Predicts severity scores and multi-output casualties/damages
│   │       └── similarity.py # Runs NearestNeighbors cosine search for historical analogies
│   │   ├── models/
│   │   │   └── registry/     # Pre-trained joblib binaries (preprocessor, estimators, KNN)
│   │   ├── src/
│   │   │   ├── preprocessing.py # Preprocessor, encoders, label generators, derived pipeline wrapper
│   │   │   └── split_strategy.py  # Chronological splitters and cross-validation folding managers
│   │   ├── tests/
│   │   │   ├── test_preprocessing.py   # Pipeline tests and joblib serialization checks
│   │   │   ├── test_split_strategy.py   # Chronological splits validation
│   │   │   ├── test_similarity.py       # KNN scaling, distances, and same-type filters
│   │   │   └── test_clustering.py       # KMeans fitting and centroid ordinal mappings
│   │   ├── train.py          # Supervised models and KNN offline indexing training script
│   │   ├── evaluate.py       # Prepares performance reports on the chronological test set
│   │   └── main.py
├── reports/                 # Holds compiled reports
│   ├── eda_report.md        # Comprehensive analysis findings from EM-DAT CSV profiling
│   ├── ingestion_detailed_report.md # Markdown summary of inserted, skipped, and corrected records
│   ├── ingestion_details.json       # JSON log containing exact database discrepancies
│   └── model_evaluation_report.md   # Performance reports, confusion matrices, and feature importances
└── scripts/                 # Administration scripts
    ├── db_init.py           # Synchronous database collections and performance index setup
    ├── ingest_data.py       # Asynchronous EM-DAT CSV dataset streaming ingestion script
    ├── generate_ingestion_report.py # Cross-references CSV against MongoDB and writes audit logs
    └── run_clustering.py    # Subregional aggregation and KMeans risk profiling training script
├── frontend/                # Next.js Frontend application folder
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/      # Secure login/registration gateway screens
    │   │   │   ├── layout.tsx
    │   │   │   ├── login/page.tsx
    │   │   │   └── register/page.tsx
    │   │   ├── admin/       # Tactical command room sub-routes (Phase 3)
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx          # Client redirect
    │   │   │   ├── dashboard/page.tsx # EOC KPI charts & live feeds
    │   │   │   ├── records/page.tsx   # Paginated disaster datatable grid
    │   │   │   ├── simulation/page.tsx # Interactive timesteps progression center
    │   │   │   └── [analytics, predictor, similarity, risk-intelligence, cross-border, resources, scenarios, reports, settings, profile] # EOC Placeholder Panels
    │   │   ├── globals.css  # Tailwind v4 theme variables configurations
    │   │   └── layout.tsx   # ThemeProvider root configurations
    │   ├── components/
    │   │   └── ui/          # Reusable EOC design system components
    │   │       ├── Button.tsx
    │   │       ├── Input.tsx
    │   │       ├── Card.tsx
    │   │       ├── SeverityBadge.tsx
    │   │       ├── Skeleton.tsx
    │   │       └── Toast.tsx
    │   └── contexts/
    │       └── ThemeContext.tsx # Toggles HTML dark/light variables
    ├── package.json         # Lists Recharts and Lucide dependencies
    └── tsconfig.json
```

---

## 4. Dataset Insights & EDA Profile

We ran python execution pipelines on the raw CSV and established the following properties (documented in `reports/eda_report.md`):
* **Data Density Limits**: Latitude and Longitude are **89.0% null**. Country centroid mapping is mandatory for geolocations.
* **Magnitude Scales**: Magnitude is **79.8% null** and features 6 distinct incompatible scales (Richter scale, Kph wind speed, flood Km2). Group-wise normalizations are required.
* **Target Variance**: Total Deaths, total affected, and adjusted damages display skewness values exceeding **3.0**.
* **Seasonality peak**: Event frequency peaks during summer months, illustrating weather-related hazard cycles.

---

## 5. Challenges Faced & Resolutions

| Challenge | Impact | Resolution |
| :--- | :--- | :--- |
| **Highly Skewed Target Variables** | Standard linear regression models fail to converge, and tree models overfit to outliers. | Applied a logarithmic target scale transformation: $z = \ln(y + 1)$ during training, mapping outputs back via $y = \max(0, e^z - 1)$ at inference. |
| **Data Sparsity in Geospatial Fields** | Mapping disaster coordinates for public radius queries failed in 89% of cases. | Configured a country-centroid fallback database pipeline that resolves missing coordinates to country coordinates using `country_centroids.json`. |
| **Magnitude Scale Incompatibility** | Comparing Richter magnitudes with cyclone wind speeds corrupted tree split divisions. | Engineered a `Normalized_Magnitude` feature, scaling magnitude values relative to their specific `Disaster Type` group mean. |
| **JSON Escaping Syntax Errors** | In `generate_eda_report.py`, string-escaped quotes `\"` caused SyntaxErrors during seaborn executions. | Cleaned quotes formatting, utilizing explicit double quotes `""` inside standard python scripts. |
| **Deaths Missingness Bug** | A zero fallback inside `clean_row` was hiding null deaths from the Pydantic schema validator, causing `deaths_is_missing` to always register as `False`. | Bypassed premature zero fallback in the pipeline, letting raw `None` parameters propagate to Pydantic, allowing the model pre-validator to correctly impute `0` and set `deaths_is_missing = True`. |
| **Chronological Date Inversion** | 60 raw records had typo entries where the `endDate` preceded the `startDate` (e.g. a disaster starting on Dec 25 but ending on Dec 1). | Implemented logical checks in `clean_row` to automatically drop chronologically inverted entries, preserving timeline integrity. |
| **Date Parameters Missingness** | Records had missing month/day entries, resulting in invalid dates. | Imputed missing months to June (`6`) and missing days to `1`. In addition, if a day value exceeded the maximum days of its month (e.g. November 31), the pipeline dynamically clips it to the month's maximum valid day. |
| **Training Target Leakage** | Target encoding mapped categories to their target means using the same training records, leading to severe overfitting. | Implemented **K-Fold out-of-fold target encoding** inside the training preprocessor (`DisasterPreprocessor`) to calculate encodings without self-leakage. |
| **Sparse Magnitude in Test Period** | Disaster magnitudes are 80-95% missing in the test period, making it a sparse feature that fails to generalize. | Engineered a **disaster duration (`duration_days`)** feature from start/end timelines, which is non-sparse, 100% available, and strongly correlates with severity. |
| **Regression-to-the-Mean** | Continuous regressors rarely predict extreme values, causing static ground truth thresholds to yield extremely poor recall (~4%) on the `Extreme` class. | Computed **dynamic percentile thresholds** directly on the model's training predictions to preserve class distributions at inference. |
| **Transient DNS SRV Resolution Timeouts** | Local Windows environments frequently fail to resolve hostnames on Atlas clusters. | Overrode the default resolver in Python's `dns.resolver.default_resolver` using Google (`8.8.8.8`) and Cloudflare (`1.1.1.1`) resolvers at script headers. |
| **BSON ObjectId Serialization** | FastAPI endpoint responses failed with unhandled `ResponseValidationError` when serializing MongoDB's native `ObjectId` in disaster records, causing the browser to block the response as a CORS preflight failure. | Integrated the custom `PyObjectId` validator (using Pydantic v2 `BeforeValidator(str)`) into `DisasterRecordResponse` in `disaster.py` to correctly map `_id` to string representations. |
| **Wildcard CORS with Credentials** | JavaScript fetches failed on credentialed endpoints when backend CORS origins were wildcarded `["*"]`. | Replaced the wildcard origin in FastAPI's `CORSMiddleware` with explicit frontend URLs (`http://localhost:3000`, `http://127.0.0.1:3000`). |
| **OAuth2 Form Login Payloads** | FastAPI's `OAuth2PasswordRequestForm` throws 422 validations if credential objects are POSTed as JSON objects. | Rewrote the login handler to construct `URLSearchParams` and submit with the `application/x-www-form-urlencoded` header. |
| **Recharts SSR Hydration** | Dynamic SVG calculations in Recharts triggered hydration mismatches during Next.js page generation. | Wrapped Recharts elements inside React state hooks (`mounted` check in `useEffect`), fallback-rendering EOC KPI skeletons when not mounted. |
| **Route Path Name Mismatches** | Navigating to EOC coordinates `/admin/simulation` resulted in 404s due to a pluralized directory name (`simulations`). | Consolidated directories, renaming and refactoring paths to a singular `simulation/page.tsx` route matching the sidebar array. |
| **Offline Font Fetch Failures** | Next.js prefetching of Google Fonts during production builds failed under offline environments, blocking compilation. | Removed `next/font/google` and utilized system fonts ('Inter', 'JetBrains Mono', system-ui, monospace) already declared in Tailwind theme variables. |
| **Bypass Static Forms Printing** | Printing raw text input boxes on the Family Planner is not actionable or professional for emergencies. | Compiled a dynamic EOC action plan generator parsing user's input fields (members, pets, contacts grid, evacuations, and medical rules) into a double-bordered protocol document, automatically redirecting prints to this layout. |
| **Print CSS Columns Collapsing** | Media queries in print mode collapsed footer grids into vertical lists. | Enforced horizontal grid columns (`grid-template-columns: repeat(4, 1fr)`) and pinned the footer to the bottom of the page in the print stylesheet. |

---

## 6. Known Project Limitations

1. **Reporting Biases**: The EM-DAT database is populated using official reports and NGO requests. Smaller disasters in developing nations may go unrecorded, introducing a reporting bias.
2. **Imputation Gaps**: Economic damage is **80.3% null**. While iterative predictive models are used, high missingness limits the precision of absolute economic damage estimates.
3. **No Weather Forecasting**: The platform performs conditional outcome assessments (e.g. *given* a disaster occurs), not live physical weather forecasting.

---

## 7. Direct Instructions for Future Steps

When implementing the roadmap, proceed sequentially by reading the current phase description in `ROADMAP.md` and following these rules:

### How to trigger next steps:
* To start the administrative hypothetical disaster scenario builder and comparison dashboard, prompt: **"Start Phase 5"**.

### Phase 5: Scenario Template Engine Execution Guide (What to do next)
1. **Scenario Creation Endpoint**: Build `POST /api/v1/scenarios` allowing operators to construct and save hypothetical disaster parameters inside the `scenarios` collection.
2. **Retrieve Scenarios Endpoint**: Build `GET /api/v1/scenarios` for paginated scenario queries.
3. **Scenario Comparison UI**: Implement a side-by-side scenario dashboard in Next.js comparing forecasted casualties, logistics requirements, and severity risk categories.

