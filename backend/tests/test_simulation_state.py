import unittest
from unittest.mock import AsyncMock, MagicMock
from bson import ObjectId
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.core.database import get_db

class TestSimulationStateAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.mock_db = MagicMock()
        self.admin_token = create_access_token(data={"sub": "admin@earth.org", "role": "admin"})
        app.dependency_overrides[get_db] = lambda: self.mock_db

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_start_simulation_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin"
        })
        
        mock_sim = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "scenarioId": "60a4f5f5f5f5f5f5f5f5f503",
            "name": "Storm Simulation Alpha",
            "createdBy": "60a4f5f5f5f5f5f5f5f5f500",
            "status": "Initialized",
            "createdAt": "2026-07-02T12:00:00Z",
            "timesteps": []
        }
        self.mock_db.simulations.find_one = AsyncMock(return_value=mock_sim)
        self.mock_db.simulations.update_one = AsyncMock(return_value=None)
        self.mock_db.admin_audit_logs.insert_one = AsyncMock(return_value=None)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/simulations/60a4f5f5f5f5f5f5f5f5f504/start", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "Running")
        self.assertTrue(self.mock_db.simulations.update_one.called)

    def test_start_simulation_invalid_transition(self):
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin"
        })
        
        mock_sim = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "scenarioId": "60a4f5f5f5f5f5f5f5f5f503",
            "name": "Storm Simulation Alpha",
            "createdBy": "60a4f5f5f5f5f5f5f5f5f500",
            "status": "Completed", # Cannot transition Completed -> Running
            "createdAt": "2026-07-02T12:00:00Z",
            "timesteps": []
        }
        self.mock_db.simulations.find_one = AsyncMock(return_value=mock_sim)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/simulations/60a4f5f5f5f5f5f5f5f5f504/start", headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid state transition", response.json()["detail"])
