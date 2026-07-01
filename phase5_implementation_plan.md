# Phase 5 Implementation Roadmap: Scenario Template Engine

This document defines the authoritative engineering plan for implementing the **Scenario Template Engine** (Phase 5). The template engine enables disaster management operators to create, edit, duplicate, search, and compare up to four hypothetical crisis scenarios side-by-side, serving as the blueprint repository for time-stepped simulation engines (Phase 6).

---

# Chunk 1
Scenario Database Schema & Indexes

## Objective
Establish the MongoDB collection schemas, indices, and Pydantic validation structures for scenarios persistence.

## Why this chunk comes now
Acts as the baseline data-integrity foundation. Subsequent API routing layers and CRUD endpoints depend on validated schemas.

## Features covered
* Base Database Scaffolding for scenarios.

## Backend work
* **Schemas**: Create `ScenarioCreate`, `ScenarioUpdate`, `ScenarioResponse`, and `ScenarioListResponse` in `backend/app/models/schemas/scenario.py` or `disaster.py`.
* **Validation**:
  * Enforce non-empty `name` and `disasterType`.
  * Validate that magnitude is a positive float.
  * Require ISO code to match the standard 3-capital-letters pattern.
  * Check that `status` falls under `["Draft", "Published"]`.
* **Database config**: Register `scenarios` collection inside `scripts/db_init.py`.

## Frontend work
* **Strong Typing**: Create TypeScript interface `Scenario` matching the Pydantic schema in `frontend/src/types/scenario.ts`.

## API Integration
* None (Database and schema scaffold slice).

## Database work
* **Collections**: Initialize `scenarios` collection in MongoDB.
* **Indexes**: Setup:
  * Compound index: `{ "createdBy": 1, "createdAt": -1 }` for faster user dashboard listings.
  * Text index: `{ "name": "text", "description": "text", "tags": "text" }` to support free-text keyword searching.
* **Document structure**:
  ```json
  {
    "_id": "ObjectId",
    "name": "string",
    "description": "string",
    "disasterType": "string",
    "disasterSubtype": "string",
    "country": "string",
    "iso": "string",
    "region": "string",
    "magnitude": 6.8,
    "magnitudeScale": "string",
    "timelineParameters": {
      "durationHours": 48,
      "cascadingIntervalHours": 12
    },
    "notes": "string",
    "tags": ["string"],
    "status": "Draft | Published",
    "createdBy": "ObjectId",
    "createdAt": "ISODate",
    "updatedAt": "ISODate"
  }
  ```

## ML Integration
* Not applicable.

## UI/UX
* None (Scaffold vertical slice).

## Files to create
* [NEW] [scenario.py (schema)](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/backend/app/models/schemas/scenario.py)
* [NEW] [scenario.ts (type)](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/frontend/src/types/scenario.ts)

## Files to modify
* [MODIFY] [db_init.py](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/scripts/db_init.py)

## Acceptance Criteria
- [ ] Database index checks return successful creation markers.
- [ ] Schema validation rejects coordinates or negative magnitude values.

## Testing
* **Backend**: Write unit tests in `backend/tests/test_scenario_schema.py` verifying model validation bounds.

## Risks
* Text indexing overlaps. Mitigated by setting explicit weights on the text index.

## Notes
* Preparing the document structure to easily hold the simulation run outputs for Phase 6.

---

# Chunk 2
Backend Scenario REST APIs - Part 1 (Write Operations)

## Objective
Implement scenario creation and duplication routes in the FastAPI backend router, guarded by JWT authentication.

## Why this chunk comes now
Requires the database schemas established in Chunk 1. Forms the basis of database write operations.

## Features covered
* Create Scenario.
* Duplicate Scenario.
* Save Draft.
* Publish Scenario.

## Backend work
* **Routers**: Add `POST /api/v1/admin/scenarios` (Create/Save) and `POST /api/v1/admin/scenarios/{id}/duplicate` (Duplicate) to `backend/app/api/v1/endpoints/admin.py` or a new endpoints file.
* **Authorization**: JWT Admin token verification checks (`get_current_user` dependency with role `admin` enforcement).
* **Audit Logging**: Write audit log entries into `admin_audit_logs` tracking scenario creation and duplication.

## Frontend work
* None (Backend API focus).

## API Integration
* `POST /api/v1/admin/scenarios`:
  * Request: `ScenarioCreate`
  * Response: `ScenarioResponse`
* `POST /api/v1/admin/scenarios/{id}/duplicate`:
  * Request: None
  * Response: `ScenarioResponse` (with appended " - Copy" suffix)

## Database work
* **Read**: Lookup origin scenario by `_id` during duplication checks.
* **Write**: Insert scenario documents using `insert_one` and update logs in `admin_audit_logs`.

## ML Integration
* Not applicable.

## UI/UX
* None (Backend API focus).

## Files to create
* None.

## Files to modify
* [MODIFY] [admin.py (endpoints)](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/backend/app/api/v1/endpoints/admin.py)
* [MODIFY] [api.py (register)](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/backend/app/api/v1/api.py)

## Acceptance Criteria
- [ ] Unauthenticated requests return `401 Unauthorized`.
- [ ] Duplicating non-existent scenario returns `404 Not Found`.

## Testing
* **Backend**: Write test coverage in `backend/tests/test_scenario_api.py` validating POST auth blocks and duplication duplicates.

## Risks
* Document nesting leaks during duplicating maps. Resolved by deep copying payloads before insertion.

## Notes
* Duplication assigns the requester's `userId` as the new owner.

---

# Chunk 3
Backend Scenario REST APIs - Part 2 (Read & Edit Operations)

## Objective
Implement endpoints to list, search, retrieve, edit, and delete scenarios.

## Why this chunk comes now
Completes backend Scenario REST CRUD parameters. Ready to serve the frontend portal.

## Features covered
* Edit Scenario.
* Delete Scenario.
* Search Scenarios.
* Filter Scenarios.
* Sort Scenarios.
* Pagination.

## Backend work
* **Routers**: Add `GET /api/v1/admin/scenarios` (List), `GET /api/v1/admin/scenarios/{id}` (Get), `PUT /api/v1/admin/scenarios/{id}` (Edit), and `DELETE /api/v1/admin/scenarios/{id}` (Delete).
* **Search & Filters**:
  * Support `?search=keyword` executing text queries.
  * Support `?disasterType=Flood` and `?status=Published`.
  * Support `?sort=createdAt` or `?sort=name` (ascending/descending).
* **Pagination**: Enforce page limit parameters (default 20, max 100).
* **Authorization**: JWT Admin access limits.

## Frontend work
* None (Backend API focus).

## API Integration
* `GET /api/v1/admin/scenarios` -> Paginated list
* `GET /api/v1/admin/scenarios/{id}` -> Single detail
* `PUT /api/v1/admin/scenarios/{id}` -> Update request
* `DELETE /api/v1/admin/scenarios/{id}` -> Delete confirmation

## Database work
* **Read**: Aggregates scenarios using `find()` with dynamic filter queries.
* **Write**: `update_one` and `delete_one` updates.

## ML Integration
* Not applicable.

## UI/UX
* None.

## Files to modify
* [MODIFY] [admin.py](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/backend/app/api/v1/endpoints/admin.py)

## Acceptance Criteria
- [ ] Query responses complete in $< 10\text{ms}$.
- [ ] Deleting a scenario purges document references correctly.

## Testing
* **Backend**: Add test blocks in `backend/tests/test_scenario_api.py` covering pagination calculations, search text matches, and deletion checks.

## Risks
* Query lock-ups on large scenario datasets. Mitigated by enforcing strict index lookups.

## Notes
* Version incrementing fields can be mapped in metadata blocks.

---

# Chunk 4
Scenario Library List UI & Search Dashboard

## Objective
Create the Admin Scenario Library view dashboard page featuring paginated listing tables, search fields, and filters.

## Why this chunk comes now
Connects the backend list REST endpoint (Chunk 3) to the frontend UI dashboard.

## Features covered
* Scenario Library.
* Search, Filters, and Sorting UI.

## Backend work
* None (Frontend UI focus).

## Frontend work
* **Routes**: Implement `/admin/scenarios/page.tsx` portal dashboard.
* **Layouts**: High-density grid display mapping historical EOC templates.
* **Search / Filter Inputs**: Real-time keyword search text box and selector filters (Disaster Type, Status).
* **Loading & Empty States**: Add skeleton tables and empty search results alerts.

## API Integration
* Consumes `GET /api/v1/admin/scenarios`.

## Database work
* Indirectly queries scenarios collection.

## ML Integration
* Not applicable.

## UI/UX
* Scenario list screen with dynamic table row heights.
* Component skeleton loaders when state resolves.
* Toast messages displaying network connection failures.

## Files to create
* [NEW] [page.tsx (list)](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/frontend/src/app/admin/scenarios/page.tsx)

## Files to modify
* [MODIFY] [PublicNavbar.tsx](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/frontend/src/components/ui/PublicNavbar.tsx) (add Admin Scenarios shortcut if required)

## Acceptance Criteria
- [ ] Switching filter choices updates query fetches.
- [ ] Text search queries return results immediately.

## Testing
* **Frontend**: Write Cypress/Playwright integration tests or mock React Testing Library specs verifying search bar trigger calls.

## Risks
* Unbounded re-renders during state updates. Resolved by debouncing search queries.

## Notes
* Leverages standard Card components.

---

# Chunk 5
Scenario Card Component & Duplication/Deletion Handles

## Objective
Build reusable scenario cards featuring summary tags, status badges, and duplication/deletion event handlers.

## Why this chunk comes now
Refines list cards interaction behaviors before building creation/edit wizards.

## Features covered
* Reusable Scenario Card components.
* Deletion dialog modals.

## Backend work
* None (Frontend UI focus).

## Frontend work
* **Components**: Create `ScenarioCard.tsx` under components directories.
* **Dialogs**: confirmation delete prompts.
* **Quick Actions**: Add action buttons (Duplicate, Delete, Edit).

## API Integration
* Consumes `POST /api/v1/admin/scenarios/{id}/duplicate` and `DELETE /api/v1/admin/scenarios/{id}`.

## Database work
* Indirect database writes from endpoints.

## ML Integration
* Not applicable.

## UI/UX
* Card hover states.
* Slide-out details drawer.
* Success toasts displaying synchronization updates.

## Files to create
* [NEW] [ScenarioCard.tsx](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/frontend/src/components/ui/ScenarioCard.tsx)

## Files to modify
* [MODIFY] [page.tsx (list)](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/frontend/src/app/admin/scenarios/page.tsx) (import ScenarioCard)

## Acceptance Criteria
- [ ] Confirming duplicate generates a new card listing.
- [ ] Deletion prompts require explicit check-actions before execution.

## Testing
* **Frontend**: Verify click events, modal rendering, and card hover variables.

## Risks
* Dialog overlays blocking layouts. Add clean portal nodes to map modals outside parent nodes.

## Notes
* Layout colors match EOC standard metrics.

---

# Chunk 6
Scenario Creation Form Wizard - Core Parameters

## Objective
Establish the Scenario Creation gateway page mapping core inputs (Disaster, Location, Magnitude).

## Why this chunk comes now
Acts as Step 1 of the scenario configurator layout, preceding metadata extensions.

## Features covered
* Scenario Configuration input forms.

## Backend work
* None (Frontend UI focus).

## Frontend work
* **Routes**: Create `/admin/scenarios/new/page.tsx` route.
* **Form Inputs**: Core hazard parameters:
  * Select boxes for Disaster Type/Subtype.
  * Country search dropdown list.
  * Numeric magnitude field + select magnitude scale.

## API Integration
* None (Form design focus).

## Database work
* Not applicable.

## ML Integration
* Not applicable.

## UI/UX
* Core Parameter configuration wizard.
* Client-side validation warnings (e.g. non-numeric magnitudes blocked).

## Files to create
* [NEW] [page.tsx (new)](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/frontend/src/app/admin/scenarios/new/page.tsx)

## Files to modify
* None.

## Acceptance Criteria
- [ ] Country search input displays autocomplete options.
- [ ] Invalid input prevents progression to the next parameters.

## Testing
* **Frontend**: Mock input change events validating bounds checking.

## Risks
* Magnitude scale mismatches. Restrict magnitude scales based on the selected disaster type.

---

# Chunk 7
Scenario Creation Form Wizard - Metadata & Publish Actions

## Objective
Extend the Scenario Creator wizard to support operational timeline parameters, tags, and publish actions.

## Why this chunk comes now
Completes parameters configuration, enabling backend database persistence.

## Features covered
* Create Scenario payload submissions.
* Draft vs Published toggle states.

## Backend work
* None (Frontend UI focus).

## Frontend work
* **Form Parameters**: Step 2 parameters:
  * Timeline duration and interval parameters inputs.
  * Notes text area block.
  * Tags list inputs.
* **Actions**: Save Draft / Publish Scenario payload buttons.

## API Integration
* Consumes `POST /api/v1/admin/scenarios` submitting the finalized payload.

## Database work
* Database scenario document inserts.

## ML Integration
* Not applicable.

## UI/UX
* Double-step wizard progression indicator.
* Redirect to dashboard list upon save.

## Files to modify
* [MODIFY] [page.tsx (new)](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/frontend/src/app/admin/scenarios/new/page.tsx)

## Acceptance Criteria
- [ ] Clicking "Save Draft" updates dashboard list with a "Draft" status card.
- [ ] Success/Error toasts report transmission status.

## Testing
* **Integration**: End-to-end form fill simulation checking API payload schemas.

## Risks
* Unsaved inputs on page navigations. Add browser navigation warning popup guards.

---

# Chunk 8
Scenario Editing & Versioning UI

## Objective
Develop the Scenario Editor route mapping existing parameters and versioning configurations.

## Why this chunk comes now
Requires Chunk 6 and 7 forms structure. Permits updating saved configurations.

## Features covered
* Edit Scenario.
* Versioning updates.

## Backend work
* None (Frontend UI focus).

## Frontend work
* **Routes**: Create `/admin/scenarios/[id]/edit/page.tsx` portal editor.
* **State Mapping**: Hydrate form fields with database results.
* **Payload Updates**: Sends changes to PUT API.

## API Integration
* Consumes `GET /api/v1/admin/scenarios/{id}` and `PUT /api/v1/admin/scenarios/{id}`.

## Database work
* Database `update_one` writes.

## ML Integration
* Not applicable.

## UI/UX
* Editor interface pre-hydrating saved data.
* Revision notes modal.

## Files to create
* [NEW] [page.tsx (edit)](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/frontend/src/app/admin/scenarios/[id]/edit/page.tsx)

## Acceptance Criteria
- [ ] Changing input parameters and clicking save updates database values.
- [ ] Back navigate buttons do not save modifications.

## Testing
* **Integration**: Confirm PUT queries dispatch updated key payloads.

## Risks
* Overwriting concurrent edits. Resolved via updatedAt timestamp checking checks.

---

# Chunk 9
Backend Batch Predictions & Comparison API

## Objective
Implement a backend REST endpoint that runs ML predictions and gathers similarity analogs for up to four scenarios simultaneously.

## Why this chunk comes now
Permits frontend comparative dashboards to fetch statistical metrics in a single API roundtrip.

## Features covered
* Compare up to four scenarios side-by-side.
* Run predictions on scenarios.

## Backend work
* **Routers**: Add `POST /api/v1/admin/scenarios/compare` to `admin.py`.
* **Services**:
  * Accepts a list of up to 4 scenario IDs.
  * For each scenario, query the ML Microservice:
    * `/predict` route (Expected Deaths, Affected, Damages, Severity Class).
    * `/similarity` route (Top 5 historical anomalies).
  * Consumes regional risk profiles to calculate vulnerability scores.
  * Return unified comparison payloads.

## Frontend work
* None (Backend API focus).

## API Integration
* `POST /api/v1/admin/scenarios/compare`:
  * Request: `{"scenarioIds": ["id1", "id2", "id3", "id4"]}`
  * Response: List of scenario predictions + similarity vectors.

## Database work
* Read scenarios definitions using list queries.

## ML Integration
* **Prediction API**: Fetches outcomes from the XGBoost Derived regressor service.
* **Similarity API**: Queries KNN index for same-type historical events.
* **Regional Risk API**: Maps risk scores.

## Files to modify
* [MODIFY] [admin.py](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/backend/app/api/v1/endpoints/admin.py)

## Acceptance Criteria
- [ ] Batch queries resolve in $< 100\text{ms}$.
- [ ] Submitting more than 4 IDs returns a `400 Bad Request` validation code.

## Testing
* **Backend**: Unit tests in `backend/tests/test_scenario_compare.py` verifying ML proxy call wrappers.

## Risks
* Microservice connection latency. Mitigated by run proxy queries asynchronously.

---

# Chunk 10
Scenario Comparison Board UI Grid

## Objective
Build the side-by-side Scenario Comparison dashboard page comparing parameters, predicted casualties, and severity index indicators.

## Why this chunk comes now
Requires the backend Comparison API (Chunk 9). Renders graphical tables on the client.

## Features covered
* Side-by-side comparison tables.
* Predicted outcome indices cards.

## Backend work
* None (Frontend UI focus).

## Frontend work
* **Routes**: Create `/admin/scenarios/compare/page.tsx` comparison dashboard.
* **Grid Components**: Flexible grid columns supporting 2, 3, or 4 comparisons.
* **Indicators**:
  * Severity Class badges (Rose, Orange, Amber, Emerald).
  * Bar charts comparing casualties and economic damages.

## API Integration
* Consumes `POST /api/v1/admin/scenarios/compare`.

## Database work
* Not applicable.

## ML Integration
* Consume predicted outputs inside the frontend indicators.

## UI/UX
* Dense, Government-themed comparison tables.
* Highlight colors for Extreme severity matches.
* Responsive layouts matching columns down to flex-stacks on mobile.

## Files to create
* [NEW] [page.tsx (compare)](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/frontend/src/app/admin/scenarios/compare/page.tsx)

## Acceptance Criteria
- [ ] Comparison boards display columns cleanly without overlapping.
- [ ] Confined statistics reflect database models.

## Testing
* **Frontend**: Verify grid column counts adjust correctly to scenario payload lengths.

## Risks
* Text overflows on standard 1080p monitors. Handled by wrapping strings and truncation metrics.

---

# Chunk 11
Similar Historical Events & Deficit Placeholders

## Objective
Integrate nearest neighbor analogs lists and setup resource deficits layout placeholders within the comparison views.

## Why this chunk comes now
Completes Phase 5 deliverables, leaving the pipeline formatted for Phase 6 simulations ingest.

## Features covered
* Similar Historical Events listings.
* Resource Estimates placeholders.

## Backend work
* None (Frontend UI focus).

## Frontend work
* **UI Modules**:
  * Render the 5 analog events returned by KNN searches under each scenario column.
  * Add a "Resource Plan Estimates" dashboard placeholder box under each column, displaying mock ambulances and supplies counts.

## API Integration
* Consumes the similarity and prediction context data returned in Chunk 9 payload.

## Database work
* Not applicable.

## ML Integration
* Display similarity indexes output.

## UI/UX
* Clean list components listing analog dates, locations, and deaths.
* Redirection links to explore these analog disaster files.
* Unified action buttons to "Launch Simulation Engine" (preparations for Phase 6).

## Files to modify
* [MODIFY] [page.tsx (compare)](file:///d:/Projects/Personal/AI-Disaster-Orchastrator/frontend/src/app/admin/scenarios/compare/page.tsx) (render analogs and resource modules)

## Acceptance Criteria
- [ ] Similarity columns load dates and coordinates.
- [ ] Launching simulation actions passes target scenario IDs to route paths.

## Testing
* **Integration**: Confirm click redirects open the correct analog record page.

## Risks
* Heavy rendering layouts. Optimized via React key indexes mapping.
