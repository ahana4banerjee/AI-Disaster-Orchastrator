import os
import sys
import unittest
from unittest.mock import MagicMock, AsyncMock
from fastapi.testclient import TestClient
from bson import ObjectId
from datetime import datetime

# Insert backend directory in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token

class TestScenarioAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.mock_db = MagicMock()
        app.dependency_overrides[get_db] = lambda: self.mock_db
        
        # Access tokens
        self.admin_token = create_access_token(data={"sub": "admin@earth.org", "role": "admin"})
        self.user_token = create_access_token(data={"sub": "user@earth.org", "role": "public_user"})
        
        # Default mock for auth lookups
        self.mock_db.users.find_one = AsyncMock(return_value={"_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"), "email": "admin@earth.org", "role": "admin"})

    def tearDown(self):
        app.dependency_overrides.clear()

    # ------------------ CREATE SCENARIO TESTS ------------------
    def test_create_scenario_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"), "email": "admin@earth.org", "role": "admin"})
        
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = ObjectId("60a4f5f5f5f5f5f5f5f5f50b")
        self.mock_db.scenarios.insert_one = AsyncMock(return_value=mock_insert_result)
        self.mock_db.audit_logs.insert_one = AsyncMock(return_value=None)

        payload = {
            "name": "Storm Scenario X",
            "description": "Simulation checklist",
            "disasterType": "Storm",
            "disasterSubtype": "Tropical cyclone",
            "country": "India",
            "iso": "IND",
            "region": "Odisha",
            "magnitude": 120.0,
            "magnitudeScale": "Kph",
            "notes": "Emergency operational checks",
            "tags": ["cyclone"],
            "status": "Draft"
        }

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/scenarios/", json=payload, headers=headers)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["name"], "Storm Scenario X")
        self.assertEqual(data["_id"], "60a4f5f5f5f5f5f5f5f5f50b")
        self.assertTrue(self.mock_db.audit_logs.insert_one.called)

    def test_create_scenario_unauthorized(self):
        payload = {
            "name": "Storm Scenario X",
            "disasterType": "Storm",
            "magnitude": 120.0,
            "magnitudeScale": "Kph"
        }
        response = self.client.post("/api/v1/scenarios/", json=payload)
        self.assertEqual(response.status_code, 401)

    def test_create_scenario_forbidden_for_user(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"_id": ObjectId("60a4f5f5f5f5f5f5f5f5f502"), "email": "user@earth.org", "role": "public_user"})
        
        payload = {
            "name": "Storm Scenario X",
            "disasterType": "Storm",
            "magnitude": 120.0,
            "magnitudeScale": "Kph"
        }
        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.client.post("/api/v1/scenarios/", json=payload, headers=headers)
        self.assertEqual(response.status_code, 403)

    # ------------------ DUPLICATE SCENARIO TESTS ------------------
    def test_duplicate_scenario_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"), "email": "admin@earth.org", "role": "admin"})
        
        existing_scenario = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f50b"),
            "name": "Cyclone Alpha",
            "description": "Original",
            "disasterType": "Storm",
            "disasterSubtype": "",
            "country": "India",
            "iso": "IND",
            "region": "",
            "magnitude": 220.0,
            "magnitudeScale": "Kph",
            "timelineParameters": {
                "durationHours": 48,
                "cascadingIntervalHours": 12
            },
            "notes": "",
            "tags": [],
            "status": "Published",
            "createdBy": "60a4f5f5f5f5f5f5f5f5f500",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        self.mock_db.scenarios.find_one = AsyncMock(return_value=existing_scenario)
        
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = ObjectId("60a4f5f5f5f5f5f5f5f5f50c")
        self.mock_db.scenarios.insert_one = AsyncMock(return_value=mock_insert_result)
        self.mock_db.audit_logs.insert_one = AsyncMock(return_value=None)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/scenarios/60a4f5f5f5f5f5f5f5f5f50b/duplicate", headers=headers)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["name"], "Cyclone Alpha - Copy")
        self.assertEqual(data["_id"], "60a4f5f5f5f5f5f5f5f5f50c")
        self.assertTrue(self.mock_db.audit_logs.insert_one.called)

    def test_duplicate_scenario_not_found(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"), "email": "admin@earth.org", "role": "admin"})
        self.mock_db.scenarios.find_one = AsyncMock(return_value=None)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/scenarios/60a4f5f5f5f5f5f5f5f5f50b/duplicate", headers=headers)
        self.assertEqual(response.status_code, 404)

    def test_duplicate_scenario_invalid_id(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/scenarios/invalid_object_id/duplicate", headers=headers)
        self.assertEqual(response.status_code, 400)
