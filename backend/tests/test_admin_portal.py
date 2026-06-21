import os
import sys
import unittest
from unittest.mock import MagicMock, AsyncMock
from bson import ObjectId
from fastapi import status
from fastapi.testclient import TestClient

# Insert backend directory in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.security import create_access_token
from app.core.database import get_db

class TestAdminPortalAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.admin_token = create_access_token(data={"sub": "admin@earth.org", "role": "admin"})
        self.user_token = create_access_token(data={"sub": "user@earth.org", "role": "public_user"})
        self.mock_db = MagicMock()
        app.dependency_overrides[get_db] = lambda: self.mock_db

    def tearDown(self):
        app.dependency_overrides.clear()

    # ------------------ Scenarios Tests ------------------
    def test_create_scenario_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"), "email": "admin@earth.org", "role": "admin"})
        
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = ObjectId("60a4f5f5f5f5f5f5f5f5f503")
        self.mock_db.scenarios.insert_one = AsyncMock(return_value=mock_insert_result)

        payload = {
            "name": "Cyclone Odisha Baseline (Category 4 Equivalent)",
            "description": "Base template for hurricane preparedness simulations.",
            "disasterType": "Storm",
            "disasterSubtype": "Tropical cyclone",
            "country": "India",
            "region": "Odisha",
            "magnitude": 220.0,
            "magnitudeScale": "Kph"
        }

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/scenarios/", json=payload, headers=headers)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["name"], payload["name"])
        self.assertEqual(data["_id"], "60a4f5f5f5f5f5f5f5f5f503")

    def test_create_scenario_forbidden_for_user(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"_id": ObjectId("60a4f5f5f5f5f5f5f5f5f502"), "email": "user@earth.org", "role": "public_user"})
        
        payload = {
            "name": "Cyclone Odisha Baseline",
            "country": "India",
            "disasterType": "Storm",
            "magnitude": 220.0
        }

        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.client.post("/api/v1/scenarios/", json=payload, headers=headers)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_compare_scenarios_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"email": "admin@earth.org", "role": "admin"})
        
        mock_scenarios = [
            {
                "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f503"),
                "name": "Storm Scenario",
                "disasterType": "Storm",
                "magnitude": 220.0
            },
            {
                "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f505"),
                "name": "Flood Scenario",
                "disasterType": "Flood",
                "magnitude": 12.0
            }
        ]
        
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=mock_scenarios)
        self.mock_db.scenarios.find = MagicMock(return_value=mock_cursor)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.get(
            "/api/v1/scenarios/compare?scenarioIds=60a4f5f5f5f5f5f5f5f5f503,60a4f5f5f5f5f5f5f5f5f505",
            headers=headers
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["name"], "Storm Scenario")
        self.assertEqual(data[1]["name"], "Flood Scenario")
        self.assertIn("predictedSeverity", data[0])
        self.assertIn("requiredAmbulances", data[1])

    # ------------------ Simulations Tests ------------------
    def test_initialize_simulation_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"), "email": "admin@earth.org", "role": "admin"})
        self.mock_db.scenarios.find_one = AsyncMock(return_value={"_id": ObjectId("60a4f5f5f5f5f5f5f5f5f503")})
        
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = ObjectId("60a4f5f5f5f5f5f5f5f5f504")
        self.mock_db.simulations.insert_one = AsyncMock(return_value=mock_insert_result)

        payload = {
            "scenarioId": "60a4f5f5f5f5f5f5f5f5f503",
            "name": "Simulation Run - Cyclone Odisha Cat 4"
        }

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/simulations/", json=payload, headers=headers)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        data = response.json()
        self.assertEqual(data["simulationId"], "60a4f5f5f5f5f5f5f5f5f504")
        self.assertEqual(data["status"], "Initialized")

    def test_get_simulation_status_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"email": "admin@earth.org", "role": "admin"})
        
        mock_sim = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "scenarioId": "60a4f5f5f5f5f5f5f5f5f503",
            "name": "Simulation Run - Cyclone Odisha Cat 4",
            "createdBy": "60a4f5f5f5f5f5f5f5f5f500",
            "status": "Initialized",
            "createdAt": "2026-06-16T22:31:00Z",
            "timesteps": []
        }
        self.mock_db.simulations.find_one = AsyncMock(return_value=mock_sim)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.get("/api/v1/simulations/60a4f5f5f5f5f5f5f5f5f504", headers=headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["name"], "Simulation Run - Cyclone Odisha Cat 4")
        self.assertEqual(data["_id"], "60a4f5f5f5f5f5f5f5f5f504")

    def test_simulation_ws_streaming(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"email": "admin@earth.org", "role": "admin"})
        self.mock_db.simulations.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "scenarioId": "60a4f5f5f5f5f5f5f5f5f503",
            "name": "Simulation Run",
            "createdBy": "60a4f5f5f5f5f5f5f5f5f500"
        })
        self.mock_db.scenarios.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f503"),
            "magnitude": 220.0,
            "disasterType": "Storm"
        })
        self.mock_db.simulations.update_one = AsyncMock()

        # Connect WebSocket using test client
        with self.client.websocket_connect(
            f"/api/v1/simulations/60a4f5f5f5f5f5f5f5f5f504/ws?token={self.admin_token}"
        ) as ws:
            # Read step updates
            for step in range(3):
                msg = ws.receive_json()
                self.assertEqual(msg["type"], "TIMESTEP_UPDATE")
                self.assertEqual(msg["data"]["step"], step)
                self.assertIn("infrastructureStates", msg["data"])
            
            # Read completion status
            done_msg = ws.receive_json()
            self.assertEqual(done_msg["type"], "SIMULATION_COMPLETED")
            self.assertEqual(done_msg["data"]["status"], "Completed")

    # ------------------ Reports Tests ------------------
    def test_compile_report_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"), "email": "admin@earth.org", "role": "admin"})
        self.mock_db.simulations.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "name": "Simulation Run",
            "timesteps": [{"step": 0, "narrative": "Onset events details."}]
        })
        
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = ObjectId("60a4f5f5f5f5f5f5f5f5f508")
        self.mock_db.ai_reports.insert_one = AsyncMock(return_value=mock_insert_result)
        self.mock_db.ai_reports.update_one = AsyncMock()

        payload = {
            "simulationId": "60a4f5f5f5f5f5f5f5f5f504",
            "title": "SITREP - Cyclone Odisha Coastal Response Plan"
        }

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/reports/", json=payload, headers=headers)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["title"], payload["title"])
        self.assertEqual(data["_id"], "60a4f5f5f5f5f5f5f5f5f508")
        self.assertEqual(data["pdfStorageUrl"], "/api/v1/reports/60a4f5f5f5f5f5f5f5f5f508/pdf")

    def test_stream_report_pdf_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"email": "admin@earth.org", "role": "admin"})
        self.mock_db.ai_reports.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f508"),
            "pdfBytes": b"%PDF-1.4 sample PDF bytes test"
        })

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.get("/api/v1/reports/60a4f5f5f5f5f5f5f5f5f508/pdf", headers=headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers["content-type"], "application/pdf")
        self.assertEqual(response.content, b"%PDF-1.4 sample PDF bytes test")

if __name__ == "__main__":
    unittest.main()
