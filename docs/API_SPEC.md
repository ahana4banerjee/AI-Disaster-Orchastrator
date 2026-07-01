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

### 3.1 Retrieve Disaster Awareness Guides
* **Method**: `GET`
* **Endpoint**: `/api/v1/public/awareness`
* **Authorization**: None (Public)
* **Response Schema (200 OK)**:
  ```json
  [
    {
      "hazard": "flood",
      "description": "Rapid accumulation of water in normally dry landmass areas...",
      "warningSigns": ["Rapidly rising water levels..."],
      "before": ["Build an emergency kit..."],
      "during": ["Evacuate immediately..."],
      "after": ["Boil all drinking water..."],
      "resources": ["FEMA Flood Safety Guide"]
    }
  ]
  ```

### 3.2 Retrieve Disaster Awareness Guide by Hazard
* **Method**: `GET`
* **Endpoint**: `/api/v1/public/awareness/{hazard}`
* **Authorization**: None (Public)
* **Response Schema (200 OK)**: Single awareness guide object.

### 3.3 Retrieve Dynamic Preparedness Packing Checklist
* **Method**: `GET`
* **Endpoint**: `/api/v1/public/preparedness/checklist`
* **Authorization**: None (Public)
* **Request Parameters**:
  * `country` (string, required)
  * `disasterType` (string, required)
* **Response Schema (200 OK)**:
  ```json
  [
    {
      "item": "Pack a 3-day supply of water...",
      "category": "Supplies",
      "priority": "Critical"
    }
  ]
  ```

### 3.4 Get Personal Readiness Profile
* **Method**: `GET`
* **Endpoint**: `/api/v1/public/readiness`
* **Authorization**: Bearer Token (Role: `public_user` or `admin`)
* **Response Schema (200 OK)**:
  ```json
  {
    "userId": "60a4f5f5f5f5f5f5f5f5f506",
    "checkedItems": [
      "water_3_days",
      "food_3_days",
      "first_aid_kit"
    ],
    "score": 30,
    "updatedAt": "2026-07-01T02:00:00Z"
  }
  ```

### 3.5 Update Personal Readiness Profile Checked Items
* **Method**: `PUT`
* **Endpoint**: `/api/v1/public/readiness`
* **Authorization**: Bearer Token (Role: `public_user` or `admin`)
* **Request Schema**:
  ```json
  {
    "checkedItems": [
      "water_3_days",
      "food_3_days",
      "first_aid_kit"
    ]
  }
  ```
* **Response Schema (200 OK)**: Same as GET response, displaying calculated updated `score` (0-100).

### 3.6 Get Family Emergency Plan
* **Method**: `GET`
* **Endpoint**: `/api/v1/public/family-plan`
* **Authorization**: Bearer Token (Role: `public_user` or `admin`)
* **Response Schema (200 OK)**:
  ```json
  {
    "userId": "60a4f5f5f5f5f5f5f5f5f506",
    "memberCount": 4,
    "contacts": "[{\"name\":\"John\",\"relation\":\"Cousin\",\"phone\":\"555-0199\"}]",
    "evacuationRoute": "Route 9 North to shelter site A",
    "medicalNeeds": "Carry Insulin pack for grandfather",
    "petAssistance": "Cat carrier and dry food pack",
    "updatedAt": "2026-07-01T02:00:00Z"
  }
  ```

### 3.7 Create or Update Family Emergency Plan
* **Method**: `POST`
* **Endpoint**: `/api/v1/public/family-plan`
* **Authorization**: Bearer Token (Role: `public_user` or `admin`)
* **Request Schema**:
  ```json
  {
    "memberCount": 4,
    "contacts": "[{\"name\":\"John\",\"relation\":\"Cousin\",\"phone\":\"555-0199\"}]",
    "evacuationRoute": "Route 9 North to shelter site A",
    "medicalNeeds": "Carry Insulin pack for grandfather",
    "petAssistance": "Cat carrier and dry food pack"
  }
  ```
* **Response Schema (200 OK)**: Same structure as GET response.

### 3.8 AI Assistant Chat Gateway
* **Method**: `POST`
* **Endpoint**: `/api/v1/public/ai-assistant/chat`
* **Authorization**: None (Public)
* **Request Schema**:
  ```json
  {
    "message": "how to prepare for a flood?"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "reply": "### EOC OFFICIAL BULLETIN: FLOOD SAFETY PROTOCOLS...",
    "context": ["/awareness/flood", "/preparedness"]
  }
  ```

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

---

## 10. Analytics APIs

### 10.1 Retrieve Regional Risk Clusters
* **Method**: `GET`
* **Endpoint**: `/api/v1/analytics/regional-risk`
* **Authorization**: None (Public)
* **Response Schema (200 OK)**:
  ```json
  [
    {
      "id": "60a4f5f5f5f5f5f5f5f5f506",
      "subregion": "Southern Asia",
      "frequency": 3.42,
      "mortalityRate": 0.00045,
      "economicRisk": 0.0012,
      "maxMagnitude": 7.8,
      "clusterId": 3,
      "riskTier": "Extreme",
      "updatedAt": "2026-06-19T23:39:58Z"
    }
  ]
  ```

### 10.2 Retrieve Regional Risk Cluster by Subregion
* **Method**: `GET`
* **Endpoint**: `/api/v1/analytics/regional-risk/{subregion}`
* **Authorization**: None (Public)
* **Response Schema (200 OK)**:
  ```json
  {
    "id": "60a4f5f5f5f5f5f5f5f5f506",
    "subregion": "Southern Asia",
    "frequency": 3.42,
    "mortalityRate": 0.00045,
    "economicRisk": 0.0012,
    "maxMagnitude": 7.8,
    "clusterId": 3,
    "riskTier": "Extreme",
    "updatedAt": "2026-06-19T23:39:58Z"
  }
  ```

---

## 11. Scenario Template Engine APIs

### 11.1 Create Scenario Template
* **Method**: `POST`
* **Endpoint**: `/api/v1/scenarios`
* **Authorization**: JWT (Admin Role Required)
* **Request Schema**:
  ```json
  {
    "name": "Storm Scenario Alpha",
    "description": "Odisha coastal category 4 simulation",
    "disasterType": "Storm",
    "disasterSubtype": "Tropical cyclone",
    "country": "India",
    "iso": "IND",
    "region": "Odisha",
    "magnitude": 220.0,
    "magnitudeScale": "Kph",
    "timelineParameters": {
      "durationHours": 48,
      "cascadingIntervalHours": 12
    },
    "notes": "Evacuation shelters priority operational notes.",
    "tags": ["cyclone", "eastern-grid"],
    "status": "Published"
  }
  ```
* **Response Schema (201 Created)**:
  ```json
  {
    "id": "60a4f5f5f5f5f5f5f5f5f50b",
    "name": "Storm Scenario Alpha",
    "description": "Odisha coastal category 4 simulation",
    "disasterType": "Storm",
    "disasterSubtype": "Tropical cyclone",
    "country": "India",
    "iso": "IND",
    "region": "Odisha",
    "magnitude": 220.0,
    "magnitudeScale": "Kph",
    "timelineParameters": {
      "durationHours": 48,
      "cascadingIntervalHours": 12
    },
    "notes": "Evacuation shelters priority operational notes.",
    "tags": ["cyclone", "eastern-grid"],
    "status": "Published",
    "createdBy": "60a4f5f5f5f5f5f5f5f5f500",
    "createdAt": "2026-07-01T18:00:00Z",
    "updatedAt": "2026-07-01T18:00:00Z"
  }
  ```

### 11.2 List Scenarios
* **Method**: `GET`
* **Endpoint**: `/api/v1/scenarios`
* **Authorization**: JWT (Admin Role Required)
* **Parameters**:
  * `page` (int, default: 1)
  * `limit` (int, default: 20)
  * `search` (str, optional)
  * `disasterType` (str, optional)
  * `status` (str, optional)
  * `sort` (str, default: `createdAt`)
  * `order` (int, default: -1)
* **Response Schema (200 OK)**:
  ```json
  {
    "totalCount": 1,
    "page": 1,
    "totalPages": 1,
    "data": [
      {
        "id": "60a4f5f5f5f5f5f5f5f5f50b",
        "name": "Storm Scenario Alpha",
        "disasterType": "Storm",
        "magnitude": 220.0,
        "magnitudeScale": "Kph",
        "status": "Published",
        "createdAt": "2026-07-01T18:00:00Z"
      }
    ]
  }
  ```

### 11.3 Retrieve Single Scenario
* **Method**: `GET`
* **Endpoint**: `/api/v1/scenarios/{id}`
* **Authorization**: JWT (Admin Role Required)
* **Response Schema (200 OK)**: Returns full Scenario detail schema.

### 11.4 Update Scenario
* **Method**: `PUT`
* **Endpoint**: `/api/v1/scenarios/{id}`
* **Authorization**: JWT (Admin Role Required)
* **Request Schema**: ScenarioUpdate Pydantic optional parameters payload.
* **Response Schema (200 OK)**: Returns updated Scenario document.

### 11.5 Duplicate Scenario
* **Method**: `POST`
* **Endpoint**: `/api/v1/scenarios/{id}/duplicate`
* **Authorization**: JWT (Admin Role Required)
* **Response Schema (201 Created)**: Returns duplicated Scenario document with `" - Copy"` suffix name.

### 11.6 Delete Scenario
* **Method**: `DELETE`
* **Endpoint**: `/api/v1/scenarios/{id}`
* **Authorization**: JWT (Admin Role Required)
* **Response Status**: `204 No Content` on successful purge.

### 11.7 Batch Compare Scenarios
* **Method**: `POST`
* **Endpoint**: `/api/v1/admin/scenarios/compare`
* **Authorization**: JWT (Admin Role Required)
* **Request Schema**:
  ```json
  {
    "scenarioIds": ["60a4f5f5f5f5f5f5f5f5f50b", "60a4f5f5f5f5f5f5f5f5f50c"]
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  [
    {
      "id": "60a4f5f5f5f5f5f5f5f5f50b",
      "name": "Storm Scenario Alpha",
      "disasterType": "Storm",
      "magnitude": 220.0,
      "magnitudeScale": "Kph",
      "country": "India",
      "region": "Odisha",
      "predictions": {
        "severityClass": "Extreme",
        "impactMetrics": {
          "expectedDeaths": 42,
          "expectedTotalAffected": 145000,
          "expectedDamageUSD": 1450000.0
        },
        "confidenceScore": 0.85,
        "riskIndex": 82.5
      },
      "requiredResources": {
        "ambulances": 1471,
        "generators": 290,
        "waterLiters": 435000
      },
      "historicalAnalogs": [
        {
          "year": 2013,
          "country": "India",
          "location": "Ganjam",
          "magnitude": 260.0,
          "deaths": 44,
          "affectedPopulation": 13200000,
          "economicDamageUSD": 1500000.0,
          "similarityPercentage": 92.5
        }
      ]
    }
  ]
  ```


