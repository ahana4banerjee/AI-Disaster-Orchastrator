# API Design Specification Document
## Project: AI Disaster Intelligence & Decision Support Platform

This document describes the API endpoints, request/response payloads, validation criteria, and role-based access rules for the FastAPI backend service.

---

## 1. Authentication APIs

### 1.1 User Registration
* **Method**: `POST`
* **Endpoint**: `/api/v1/auth/register`
* **Authorization**: None (Public)
* **Request Schema**:
  ```json
  {
    "email": "citizen.prepared@earth.org",
    "password": "SecurePassword123!",
    "role": "public_user"
  }
  ```
* **Response Schema (201 Created)**:
  ```json
  {
    "id": "60a4f5f5f5f5f5f5f5f5f506",
    "email": "citizen.prepared@earth.org",
    "role": "public_user",
    "isActive": true,
    "createdAt": "2026-06-16T22:00:00Z"
  }
  ```
* **Validation Rules**:
  * `email` must be a valid email format.
  * `password` must be at least 8 characters long, containing 1 capital letter, 1 number, and 1 special character.
  * `role` must be one of: `public_user`, `admin`.

### 1.2 User Login (Token Generation)
* **Method**: `POST`
* **Endpoint**: `/api/v1/auth/login`
* **Authorization**: None (Public)
* **Request Schema (application/x-www-form-urlencoded)**:
  ```
  username=citizen.prepared@earth.org&password=SecurePassword123!
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "role": "public_user"
  }
  ```
* **Validation Rules**:
  * Fields must not be empty. Form-encoded according to OAuth2 standards.

### 1.3 Refresh Access Token
* **Method**: `POST`
* **Endpoint**: `/api/v1/auth/refresh`
* **Authorization**: JWT Refresh Token in Cookies (HTTPOnly)
* **Request Schema**: None
* **Response Schema (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  }
  ```

### 1.4 Retrieve Current User
* **Method**: `GET`
* **Endpoint**: `/api/v1/auth/me`
* **Authorization**: Bearer Token (Any authenticated user)
* **Request Schema**: None
* **Response Schema (200 OK)**:
  ```json
  {
    "id": "60a4f5f5f5f5f5f5f5f5f506",
    "email": "citizen.prepared@earth.org",
    "role": "public_user",
    "isActive": true
  }
  ```

---

## 2. Admin APIs

### 2.1 Retrieve Disaster Records (Paginated)
* **Method**: `GET`
* **Endpoint**: `/api/v1/admin/records`
* **Authorization**: Bearer Token (Role: `admin`)
* **Request Schema (Query Parameters)**:
  * `page` (int, default: 1)
  * `limit` (int, default: 20, max: 100)
  * `country` (string, optional)
  * `disasterType` (string, optional)
* **Response Schema (200 OK)**:
  ```json
  {
    "totalCount": 16800,
    "page": 1,
    "totalPages": 840,
    "data": [
      {
        "id": "60a4f5f5f5f5f5f5f5f5f501",
        "disNo": "2026-0153-KEN",
        "disasterType": "Flood",
        "country": "Kenya",
        "startDate": "2026-03-06T00:00:00Z",
        "impact": {
          "deaths": 59,
          "totalAffected": 13227
        }
      }
    ]
  }
  ```

### 2.2 Create New Disaster Record
* **Method**: `POST`
* **Endpoint**: `/api/v1/admin/records`
* **Authorization**: Bearer Token (Role: `admin`)
* **Request Schema**:
  ```json
  {
    "disNo": "2026-9999-IND",
    "disasterGroup": "Natural",
    "disasterSubgroup": "Hydrological",
    "disasterType": "Flood",
    "disasterSubtype": "Flash flood",
    "country": "India",
    "iso": "IND",
    "location": "Uttarakhand districts",
    "magnitude": 12.0,
    "magnitudeScale": "Km2",
    "geoJSON": {
      "type": "Point",
      "coordinates": [78.0322, 30.3165]
    },
    "startDate": "2026-06-15T00:00:00Z",
    "impact": {
      "deaths": 12,
      "injured": 45,
      "totalAffected": 2500,
      "economicDamageUSD": 120000
    }
  }
  ```
* **Response Schema (201 Created)**: Same as Request Schema + `id` ObjectID field.
* **Validation Rules**:
  * `startDate` must be in the past or present.
  * Coordinate coordinates must be `[longitude, latitude]` (longitude range: -180 to 180, latitude range: -90 to 90).

### 2.3 Delete Disaster Record
* **Method**: `DELETE`
* **Endpoint**: `/api/v1/admin/records/{id}`
* **Authorization**: Bearer Token (Role: `admin`)
* **Request Schema**: Path parameter `id` (hex string ObjectID)
* **Response Schema (204 No Content)**: None

### 2.4 Query Admin Action Log
* **Method**: `GET`
* **Endpoint**: `/api/v1/admin/audit-logs`
* **Authorization**: Bearer Token (Role: `admin`)
* **Request Schema (Query Parameters)**:
  * `limit` (int, default: 50)
* **Response Schema (200 OK)**:
  ```json
  [
    {
      "id": "60a4f5f5f5f5f5f5f5f5f507",
      "adminUserId": "60a4f5f5f5f5f5f5f5f5f500",
      "action": "EXECUTE_SIMULATION",
      "details": "Triggered temporal step simulation for Odisha cyclone Cat 4.",
      "timestamp": "2026-06-16T22:31:00Z"
    }
  ]
  ```

---

## 3. Public APIs

### 3.1 Get Personal Readiness Profile
* **Method**: `GET`
* **Endpoint**: `/api/v1/public/readiness`
* **Authorization**: Bearer Token (Role: `public_user`)
* **Request Schema**: None
* **Response Schema (200 OK)**:
  ```json
  {
    "id": "60a4f5f5f5f5f5f5f5f5f508",
    "familySize": 4,
    "hasElderly": true,
    "hasChildren": false,
    "vehiclesAvailable": 1,
    "readinessScore": 85,
    "checklistCompleted": [
      "water_storage",
      "emergency_kit",
      "evacuation_plan"
    ]
  }
  ```

### 3.2 Update Personal Readiness Checklist
* **Method**: `PUT`
* **Endpoint**: `/api/v1/public/readiness`
* **Authorization**: Bearer Token (Role: `public_user`)
* **Request Schema**:
  ```json
  {
    "familySize": 4,
    "hasElderly": true,
    "hasChildren": false,
    "vehiclesAvailable": 1,
    "checklistCompleted": [
      "water_storage",
      "emergency_kit",
      "evacuation_plan",
      "backup_power"
    ]
  }
  ```
* **Response Schema (200 OK)**: Same structure as GET response, displaying calculated updated `readinessScore` (0-100).
* **Validation Rules**:
  * `familySize` must be positive integer.

### 3.3 Create Family Emergency Plan
* **Method**: `POST`
* **Endpoint**: `/api/v1/public/family-plan`
* **Authorization**: Bearer Token (Role: `public_user`)
* **Request Schema**:
  ```json
  {
    "meetingPlace": "Central Park Playground",
    "outOfTownContact": "+1-555-0199",
    "evacuationRoute": "Route 9 North to shelter site A",
    "medicalSpecialInstructions": "Carry Insulin pack for grandfather"
  }
  ```
* **Response Schema (201 Created)**: Same as request + `id` and `updatedAt` timestamps.

---

## 4. Analytics APIs

### 4.1 Get Dashboard High-level KPIs
* **Method**: `GET`
* **Endpoint**: `/api/v1/analytics/dashboard`
* **Authorization**: Bearer Token (Any Authenticated User)
* **Request Schema (Query Parameters)**:
  * `country` (string, optional)
* **Response Schema (200 OK)**:
  ```json
  {
    "totalEvents": 16800,
    "highRiskEvents": 1420,
    "averageDeaths": 28.5,
    "averageDamageUSD": 1450000
  }
  ```

### 4.2 Get Year-wise Trends
* **Method**: `GET`
* **Endpoint**: `/api/v1/analytics/trends`
* **Authorization**: Bearer Token (Any Authenticated User)
* **Request Schema (Query Parameters)**:
  * `disasterType` (string, optional)
* **Response Schema (200 OK)**:
  ```json
  [
    {
      "year": 2025,
      "eventCount": 420,
      "averageDamageUSD": 1890000
    }
  ]
  ```

### 4.3 Spatial Geospatial Lookups
* **Method**: `GET`
* **Endpoint**: `/api/v1/analytics/spatial`
* **Authorization**: Bearer Token (Any Authenticated User)
* **Request Schema (Query Parameters)**:
  * `longitude` (double, required)
  * `latitude` (double, required)
  * `radiusKm` (double, default: 500)
* **Response Schema (200 OK)**:
  ```json
  [
    {
      "disNo": "2025-0303-ECU",
      "disasterType": "Earthquake",
      "distanceKm": 124.5,
      "deaths": 0
    }
  ]
  ```

---

## 5. Prediction APIs

### 5.1 Run Disaster Impact & Severity Predictor
* **Method**: `POST`
* **Endpoint**: `/api/v1/predict/impact`
* **Authorization**: Bearer Token (Role: `admin`)
* **Request Schema**:
  ```json
  {
    "disasterType": "Storm",
    "disasterSubtype": "Tropical cyclone",
    "country": "India",
    "region": "Odisha",
    "magnitude": 220.0,
    "startMonth": 10
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "severityClass": "High",
    "impactMetrics": {
      "expectedDeaths": 84,
      "expectedTotalAffected": 540000,
      "expectedDamageUSD": 12500000
    },
    "confidenceScore": 0.89,
    "riskIndex": 82.0
  }
  ```
* **Validation Rules**:
  * `magnitude` must be positive.
  * `startMonth` must be between 1 and 12.

---

## 6. Similarity Search APIs

### 6.1 Search Similar Historical Disasters
* **Method**: `POST`
* **Endpoint**: `/api/v1/predict/similarity`
* **Authorization**: Bearer Token (Role: `admin`)
* **Request Schema**:
  ```json
  {
    "disasterType": "Storm",
    "country": "India",
    "region": "Odisha",
    "magnitude": 220.0
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  [
    {
      "year": 2004,
      "country": "India",
      "location": "Odisha, Andhra Pradesh",
      "magnitude": 215.0,
      "deaths": 95,
      "affectedPopulation": 600000,
      "economicDamageUSD": 14000000,
      "similarityPercentage": 94.2
    }
  ]
  ```

---

## 7. Scenario APIs

### 7.1 Save Scenario Config Template
* **Method**: `POST`
* **Endpoint**: `/api/v1/scenarios`
* **Authorization**: Bearer Token (Role: `admin`)
* **Request Schema**:
  ```json
  {
    "name": "Cyclone Odisha Baseline (Category 4 Equivalent)",
    "description": "Base template for hurricane preparedness simulations.",
    "disasterType": "Storm",
    "disasterSubtype": "Tropical cyclone",
    "country": "India",
    "region": "Odisha",
    "magnitude": 220.0,
    "magnitudeScale": "Kph"
  }
  ```
* **Response Schema (201 Created)**: Same as request + `id` and `createdAt` timestamps.

### 7.2 Compare Scenarios Side-by-Side
* **Method**: `GET`
* **Endpoint**: `/api/v1/scenarios/compare`
* **Authorization**: Bearer Token (Role: `admin`)
* **Request Schema (Query Parameters)**:
  * `scenarioIds` (comma-separated strings, required, e.g., `id1,id2`)
* **Response Schema (200 OK)**:
  ```json
  [
    {
      "id": "60a4f5f5f5f5f5f5f5f5f503",
      "name": "Cyclone Odisha Baseline",
      "predictedSeverity": "High",
      "predictedDeaths": 84,
      "predictedDamageUSD": 12500000,
      "requiredAmbulances": 45
    }
  ]
  ```

---

## 8. Simulation APIs

### 8.1 Initialize and Run Cascading Step Simulation
* **Method**: `POST`
* **Endpoint**: `/api/v1/simulations`
* **Authorization**: Bearer Token (Role: `admin`)
* **Request Schema**:
  ```json
  {
    "scenarioId": "60a4f5f5f5f5f5f5f5f5f503",
    "name": "Simulation Run - Cyclone Odisha Cat 4"
  }
  ```
* **Response Schema (202 Accepted)**:
  ```json
  {
    "simulationId": "60a4f5f5f5f5f5f5f5f5f504",
    "status": "Initialized",
    "timestepsCount": 3
  }
  ```

### 8.2 Retrieve Current Step Status
* **Method**: `GET`
* **Endpoint**: `/api/v1/simulations/{id}`
* **Authorization**: Bearer Token (Role: `admin`)
* **Response Schema (200 OK)**: Same structure as the Simulation collection model, showing the completed timesteps and infrastructure state indicators.

### 8.3 Simulation Progress WebSocket Channel
* **Protocol**: `WS`
* **Endpoint**: `/api/v1/simulations/{id}/ws`
* **Authorization**: Verified by sending Access Token parameter in connection request query string (`?token=jwt_string`).
* **Connection Workflow**:
  * Client connects.
  * Server starts pushing time-step changes (e.g. step execution progress: Hour 0, Hour 12, Hour 24) sequentially, streaming cascading metrics dynamically.
* **Server Message Schema**:
  ```json
  {
    "type": "TIMESTEP_UPDATE",
    "data": {
      "step": 1,
      "timeLabel": "Hour 12: Inundation",
      "infrastructureStates": {
        "powerGrid": "Failed",
        "transportationRoads": "Blocked"
      }
    }
  }
  ```

---

## 9. Reporting APIs

### 9.1 Compile and Generate AI Situation Report
* **Method**: `POST`
* **Endpoint**: `/api/v1/reports`
* **Authorization**: Bearer Token (Role: `admin`)
* **Request Schema**:
  ```json
  {
    "simulationId": "60a4f5f5f5f5f5f5f5f5f504",
    "title": "SITREP - Cyclone Odisha Coastal Response Plan"
  }
  ```
* **Response Schema (201 Created)**:
  ```json
  {
    "id": "60a4f5f5f5f5f5f5f5f5f508",
    "simulationId": "60a4f5f5f5f5f5f5f5f5f504",
    "title": "SITREP - Cyclone Odisha Coastal Response Plan",
    "pdfStorageUrl": "https://s3.amazonaws.com/ai-disaster-orch/sitreps/2026/odisha_sitrep_60a4f504.pdf",
    "createdAt": "2026-06-16T22:32:00Z"
  }
  ```

### 9.2 Stream Compiled Report PDF
* **Method**: `GET`
* **Endpoint**: `/api/v1/reports/{id}/pdf`
* **Authorization**: Bearer Token (Role: `admin`)
* **Response Schema (200 OK - file stream)**: `application/pdf` binary stream.
