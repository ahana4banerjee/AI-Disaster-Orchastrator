# Project Implementation Roadmap
## AI Disaster Intelligence & Decision Support Platform

This document outlines the step-by-step engineering roadmap for building the platform from scratch. The phases are structured to establish data integrity first, compile core ML estimators, develop API services, deploy user dashboards, and establish hosting templates.

Each phase contains specific goals, dependencies, deliverables, risks, and criteria. Use this roadmap to trigger phases sequentially (e.g., *"Start Phase 1"*).

---

## Roadmap Overview

```
[Phase 0: Research] ---> [Phase 1: Pipeline] ---> [Phase 2: ML Base]
                                                        |
[Phase 5: Scenarios] <-- [Phase 4: Public] <--- [Phase 3: Admin]
         |
         v
[Phase 6: Simulation] ---> [Phase 7: Reports] ---> [Phase 8: Deploy]
```

---

## Phase 0: Research & Data Understanding

### Goals
* Analyze the EM-DAT database schema to identify data skewness, coordinate distributions, and cardinality levels.
* Formulate baseline target-scaling thresholds for severity calculations.
* Perform Exploratory Data Analysis (EDA) on magnitude ranges across various disaster subgroups (Geophysical vs. Meteorological).

### Deliverables
* **EDA Notebook**: `notebooks/01_eda_emdat.ipynb` containing distribution plots, correlation tables, and missing value ratios.
* **Feature Catalog**: Document mapping raw CSV columns to engineered model feature candidates.

### Dependencies
* Access to raw custom EM-DAT request CSV: `data/raw/public_emdat_custom_request_2026-06-16_b4cec7bb-ec36-4c87-9762-f7cc13e97076.csv`.

### Metrics & Complexity
* **Estimated Complexity**: Low (1-2 days)
* **Risks**: Magnitudes are missing or scale-incompatible across subgroups, requiring segmented normalizations.
* **Success Criteria**: Clear definition of the composite `Severity Class` labeling rule (Equation detailed in `ML_DESIGN.md`).

---

## Phase 1: Data Ingestion & Pipeline

### Goals
* Setup the local MongoDB Atlas credentials and write asynchronous ingestion engines.
* Implement data cleaning layers (missing coordinates resolved, zero-imputations for deaths).
* Establish a modular Python pipeline that reads the raw CSV and writes clean JSON documents to the database.

### Deliverables
* **Database Init Scripts**: Configuration files creating collections and building compound and 2dsphere indexes.
* **Ingestion Script**: `scripts/ingest_data.py` (asynchronous bulk write operations utilizing the Motor driver).
* **Validation Tests**: Pydantic schema validation tests confirming zero database pollution.

### Dependencies
* Successful completion of Phase 0.
* Active MongoDB Atlas connection string configuration.

### Metrics & Complexity
* **Estimated Complexity**: Medium (2-3 days)
* **Risks**: Bulk ingestion runs can exhaust local memory limits if records are not batched correctly.
* **Success Criteria**: 100% of EMDAT CSV records mapped, cleaned, and verified within the `disaster_records` collection.

---

## Phase 2: Machine Learning Foundation

### Goals
* Code and train the core supervised and unsupervised estimators:
  * Baseline Multiclass LightGBM Classifier (Severity Class benchmark).
  * Production Derived Severity Classifier (Derived severity from multi-output XGBoost Regressors: Deaths, Total Affected, Adjusted Damages).
  * Cosine Similarity KNN model (Analog Searches).
* Export pretrained scaling pipelines, leakage-free K-Fold target encoders, and model wrappers.

### Deliverables
* **Training Script**: `ml_service/train.py` which runs time-series splits validation.
* **Model Registry Binaries**: Serialized models (`.joblib` format) written to `ml_service/models/registry/`.
* **Evaluation Report**: Text log showing macro-F1 scores, confusion matrices, and feature importances.

### Dependencies
* Successful completion of Phase 1.

### Metrics & Complexity
* **Estimated Complexity**: High (4-5 days)
* **Risks**: Target variables (casualties/economic loss) are heavily right-skewed and missingness in physical magnitudes is high in recent periods, which can lead to overfitting or prediction collapse if target leakage and time-series gaps are not handled.
* **Success Criteria**: Production Derived XGBoost model achieves a Test F1-macro score $\ge 0.43$ (outperforming the baseline LightGBM multiclass classifier F1-macro of $\sim 0.38$) on chronological splits while maintaining balanced precision and recall on the Extreme class.

---

## Phase 3: Core API & Admin Portal Basics

### Goals
* Initialize the Next.js frontend repository using Tailwind CSS.
* Initialize the FastAPI backend structure (Routers, OAuth2 security layers, Pydantic schemas).
* Create the Admin Portal landing dashboard layout, building KPIs and paginated disaster record grids.

### Deliverables
* **Next.js Base Repository**: Structure containing global themes, routing layouts, and Tailwind primitives.
* **FastAPI Core App**: API Gateway running with uvicorn workers, serving `/api/v1/auth` and `/api/v1/admin/records`.
* **Admin Dashboard UI**: Responsive view containing high-level analytics cards and record filter forms.

### Dependencies
* Successful completion of Phase 2 (ML model targets finalized).

### Metrics & Complexity
* **Estimated Complexity**: High (5-6 days)
* **Risks**: CORS configurations or token storage details can create connection issues between Next.js and FastAPI.
* **Success Criteria**: Stable JWT login workflow; Admin dashboard loads paginated EM-DAT records in $< 100\text{ms}$.

---

## Phase 4: Public Portal & Readiness Checker

### Goals
* Build the citizen-facing public portal components.
* Implement the Personal Risk Checker (regional hazard index cards).
* Build the Preparedness Checklist and questionnaire components, calculating user readiness scores (0-100).

### Deliverables
* **Public Dashboard UI**: Maps and trend views built using Recharts libraries.
* **Readiness Components**: Interactive questionnaires saving answers to MongoDB `readiness_profiles`.
* **Emergency Planner UI**: Family configuration forms producing printable checklist PDFs.

### Dependencies
* Successful completion of Phase 3.

### Metrics & Complexity
* **Estimated Complexity**: Medium (3-4 days)
* **Risks**: Unauthenticated public queries could overload aggregation pipelines if caching is not implemented.
* **Success Criteria**: Public users can input coordinates or country names and receive localized hazard insights in $< 50\text{ms}$.

---

## Phase 5: Scenario Template Engine

### Goals
* Implement the administrative Scenario Creator, allowing operators to construct and save hypothetical disaster parameters.
* Code the side-by-side scenario comparison utility, showing forecasted casualties and required logistics.

### Deliverables
* **Scenario Router**: FastAPI endpoints `/api/v1/scenarios` (POST/GET).
* **Comparison UI**: Grid view displaying side-by-side impact cards, highlight-color matching predicted risk severity.
* **Database Collection**: Active write pathways to the `scenarios` collection.

### Dependencies
* Successful completion of Phase 4.

### Metrics & Complexity
* **Estimated Complexity**: Medium (2-3 days)
* **Risks**: User interface layout breaks when comparing more than 3 scenarios on smaller monitor screens.
* **Success Criteria**: Admin operators can create, save, and compare up to 4 scenarios side-by-side.

---

## Phase 6: Asynchronous Simulation Engine

### Goals
* Implement the step-by-step cascading simulator executing temporal progression logic (Hour 0 to Hour 48).
* Establish FastAPI WebSocket endpoints to stream step executions dynamically.
* Connect predicted outputs to the Resource Recommendation Engine, calculating vehicle and supply deficits.

### Deliverables
* **Simulation Core Runner**: `app/services/simulation_engine.py` processing cascading multipliers.
* **WebSocket Router**: `/api/v1/simulations/{id}/ws` serving status updates.
* **Resource UI Dashboard**: Progress tracking screens showing status bars (Emerald, Amber, Crimson) for logistics shortfalls.

### Dependencies
* Successful completion of Phase 5.

### Metrics & Complexity
* **Estimated Complexity**: High (5-6 days)
* **Risks**: WebSocket channels are vulnerable to connection dropouts, necessitating clean client reconnect mechanisms.
* **Success Criteria**: WebSocket streams 4 temporal steps consecutively, rendering log outputs and deficits dynamically on client panels.

---

## Phase 7: AI Situation Report & Exports

### Goals
* Write the Markdown report compiler that summarizes active simulation runs, resource plans, and key operational warnings.
* Build the backend PDF renderer module, streaming generated PDF bytes to the client dashboard.

### Deliverables
* **Report compiler service**: `app/services/report_generator.py` converting JSON schemas to rich Markdown tables.
* **FastAPI Endpoint**: `/api/v1/reports/{id}/pdf` serving binary document downloads.
* **UI Export Buttons**: Icons on Next.js to trigger PDF generation and save files.

### Dependencies
* Successful completion of Phase 6.

### Metrics & Complexity
* **Estimated Complexity**: Medium (2-3 days)
* **Risks**: HTML-to-PDF rendering engines (like Weasyprint or ReportLab) can block FastAPI event loops if not executed on threadpools.
* **Success Criteria**: Generation and download of a multi-page situation report PDF completes in $< 3\text{ seconds}$ from query trigger.

---

## Phase 8: Deployment & Optimization

### Goals
* Dockerize the Next.js frontend, FastAPI backend, and ML inference service.
* Integrate Redis cache instances to catch recurring predictions and scenario parameters.
* Setup local Kubernetes or docker-compose configurations representing a high-availability production cluster.

### Deliverables
* **Dockerfiles**: Modular configuration templates for every layer.
* **Compose File**: `docker-compose.yml` linking Gateway, Core, ML Service, Redis, and a local Mongo container.
* **Redis Caching Pipeline**: Middleware intercepts checking query hashes in Redis.

### Dependencies
* Successful completion of Phase 7.

### Metrics & Complexity
* **Estimated Complexity**: Medium (3-4 days)
* **Risks**: ML containers can exceed default Docker memory configurations due to heavy model binaries.
* **Success Criteria**: Entire system boots from a single command (`docker-compose up`); Cached prediction API latencies drop below $5\text{ms}$.
