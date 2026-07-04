import unittest
from unittest.mock import AsyncMock, MagicMock, patch
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

    def test_progress_simulation_success(self):
        from datetime import datetime
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin"
        })
        
        mock_sim = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "scenarioId": ObjectId("60a4f5f5f5f5f5f5f5f5f503"),
            "name": "Storm Simulation Alpha",
            "createdBy": "60a4f5f5f5f5f5f5f5f5f500",
            "status": "Running",
            "createdAt": datetime.utcnow(),
            "currentStep": 0,
            "timesteps": [
                {
                    "step": 0,
                    "timeLabel": "Hour 0: Landfall",
                    "status": "Active",
                    "metrics": {
                        "activeCasualties": 10,
                        "displacedPopulation": 1000,
                        "structuralDamagePercentage": 5.0
                    },
                    "infrastructureStates": [
                        {"name": "Power Grid", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Road Network", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Hospitals", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Water Supply", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Telecommunications", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Fuel Supply", "status": "Operational", "color": "emerald", "details": ""}
                    ]
                }
            ]
        }
        mock_scenario = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f503"),
            "disasterType": "Storm",
            "magnitude": 80.0,
            "country": "Kenya"
        }
        
        self.mock_db.simulations.find_one = AsyncMock(side_effect=[mock_sim, mock_sim])
        self.mock_db.scenarios.find_one = AsyncMock(return_value=mock_scenario)
        self.mock_db.simulations.update_one = AsyncMock(return_value=None)
        self.mock_db.admin_audit_logs.insert_one = AsyncMock(return_value=None)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/simulations/60a4f5f5f5f5f5f5f5f5f504/progress", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.mock_db.simulations.update_one.called)

    def test_progress_simulation_invalid_state(self):
        from datetime import datetime
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin"
        })
        
        mock_sim = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "scenarioId": ObjectId("60a4f5f5f5f5f5f5f5f5f503"),
            "name": "Storm Simulation Alpha",
            "createdBy": "60a4f5f5f5f5f5f5f5f5f500",
            "status": "Created", # Not Running!
            "createdAt": datetime.utcnow(),
            "currentStep": 0,
            "timesteps": []
        }
        self.mock_db.simulations.find_one = AsyncMock(return_value=mock_sim)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/simulations/60a4f5f5f5f5f5f5f5f5f504/progress", headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Cannot advance simulation", response.json()["detail"])

    def test_progress_simulation_step_2_success(self):
        from datetime import datetime
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin"
        })
        
        mock_sim = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "scenarioId": ObjectId("60a4f5f5f5f5f5f5f5f5f503"),
            "name": "Storm Simulation Alpha",
            "createdBy": "60a4f5f5f5f5f5f5f5f5f500",
            "status": "Running",
            "createdAt": datetime.utcnow(),
            "currentStep": 1,
            "timesteps": [
                {
                    "step": 0,
                    "timeLabel": "Hour 0: Landfall",
                    "status": "Active",
                    "metrics": {
                        "activeCasualties": 10,
                        "displacedPopulation": 1000,
                        "structuralDamagePercentage": 5.0
                    },
                    "infrastructureStates": []
                },
                {
                    "step": 1,
                    "timeLabel": "Hour 6: Primary Grid Cascades",
                    "status": "Active",
                    "metrics": {
                        "activeCasualties": 12,
                        "displacedPopulation": 1100,
                        "structuralDamagePercentage": 8.0
                    },
                    "infrastructureStates": [
                        {"name": "Power Grid", "status": "Failed", "color": "extreme", "details": ""},
                        {"name": "Road Network", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Hospitals", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Water Supply", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Telecommunications", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Fuel Supply", "status": "Operational", "color": "emerald", "details": ""}
                    ]
                }
            ]
        }
        mock_scenario = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f503"),
            "disasterType": "Storm",
            "magnitude": 80.0,
            "country": "India",
            "iso": "IND"
        }
        
        self.mock_db.simulations.find_one = AsyncMock(side_effect=[mock_sim, mock_sim])
        self.mock_db.scenarios.find_one = AsyncMock(return_value=mock_scenario)
        self.mock_db.disasters.find_one = AsyncMock(return_value={"subregion": "Southern Asia"})
        self.mock_db.regional_risk_clusters.find_one = AsyncMock(return_value={"riskTier": "High"})
        self.mock_db.simulations.update_one = AsyncMock(return_value=None)
        self.mock_db.admin_audit_logs.insert_one = AsyncMock(return_value=None)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/simulations/60a4f5f5f5f5f5f5f5f5f504/progress", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.mock_db.simulations.update_one.called)

    @patch("httpx.AsyncClient.post")
    def test_progress_simulation_step_3_success(self, mock_post):
        from datetime import datetime
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "severityClass": "Severe",
            "impactMetrics": {
                "expectedDeaths": 50,
                "expectedTotalAffected": 5000,
                "expectedDamageUSD": 100000.0
            }
        }
        
        async def mock_post_async(*args, **kwargs):
            return mock_resp
        mock_post.side_effect = mock_post_async

        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin"
        })
        
        mock_sim = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "scenarioId": ObjectId("60a4f5f5f5f5f5f5f5f5f503"),
            "name": "Storm Simulation Alpha",
            "createdBy": "60a4f5f5f5f5f5f5f5f5f500",
            "status": "Running",
            "createdAt": datetime.utcnow(),
            "currentStep": 2,
            "timesteps": [
                {"step": 0, "timeLabel": "Hour 0: Landfall", "status": "Active", "metrics": {}, "infrastructureStates": []},
                {"step": 1, "timeLabel": "Hour 6: Primary Grid Cascades", "status": "Active", "metrics": {}, "infrastructureStates": []},
                {
                    "step": 2,
                    "timeLabel": "Hour 12: Transportation Corridors",
                    "status": "Active",
                    "metrics": {
                        "activeCasualties": 14,
                        "displacedPopulation": 1200,
                        "structuralDamagePercentage": 14.0
                    },
                    "infrastructureStates": [
                        {"name": "Power Grid", "status": "Failed", "color": "extreme", "details": ""},
                        {"name": "Road Network", "status": "Failed", "color": "extreme", "details": ""},
                        {"name": "Hospitals", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Water Supply", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Telecommunications", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Fuel Supply", "status": "Operational", "color": "emerald", "details": ""}
                    ]
                }
            ]
        }
        mock_scenario = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f503"),
            "disasterType": "Storm",
            "magnitude": 80.0,
            "country": "India",
            "iso": "IND"
        }
        
        self.mock_db.simulations.find_one = AsyncMock(side_effect=[mock_sim, mock_sim])
        self.mock_db.scenarios.find_one = AsyncMock(return_value=mock_scenario)
        self.mock_db.simulations.update_one = AsyncMock(return_value=None)
        self.mock_db.admin_audit_logs.insert_one = AsyncMock(return_value=None)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/simulations/60a4f5f5f5f5f5f5f5f5f504/progress", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.mock_db.simulations.update_one.called)

    @patch("httpx.AsyncClient.post")
    def test_progress_simulation_step_4_success(self, mock_post):
        from datetime import datetime
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = [
            {
                "year": 2013,
                "country": "India",
                "location": "Odisha",
                "magnitude": 90.0,
                "deaths": 44,
                "affectedPopulation": 100000,
                "economicDamageUSD": 2000000.0,
                "similarityPercentage": 95.5
            }
        ]
        
        async def mock_post_async(*args, **kwargs):
            return mock_resp
        mock_post.side_effect = mock_post_async

        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin"
        })
        
        mock_sim = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "scenarioId": ObjectId("60a4f5f5f5f5f5f5f5f5f503"),
            "name": "Storm Simulation Alpha",
            "createdBy": "60a4f5f5f5f5f5f5f5f5f500",
            "status": "Running",
            "createdAt": datetime.utcnow(),
            "currentStep": 3,
            "timesteps": [
                {"step": 0, "timeLabel": "Hour 0: Landfall", "status": "Active", "metrics": {}, "infrastructureStates": []},
                {"step": 1, "timeLabel": "Hour 6: Primary Grid Cascades", "status": "Active", "metrics": {}, "infrastructureStates": []},
                {"step": 2, "timeLabel": "Hour 12: Transportation Corridors", "status": "Active", "metrics": {}, "infrastructureStates": []},
                {
                    "step": 3,
                    "timeLabel": "Hour 24: Healthcare Stress",
                    "status": "Active",
                    "metrics": {
                        "activeCasualties": 22,
                        "displacedPopulation": 1400,
                        "structuralDamagePercentage": 19.5
                    },
                    "infrastructureStates": [
                        {"name": "Power Grid", "status": "Failed", "color": "extreme", "details": ""},
                        {"name": "Road Network", "status": "Failed", "color": "extreme", "details": ""},
                        {"name": "Hospitals", "status": "Critical", "color": "extreme", "details": ""},
                        {"name": "Water Supply", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Telecommunications", "status": "Operational", "color": "emerald", "details": ""},
                        {"name": "Fuel Supply", "status": "Operational", "color": "emerald", "details": ""}
                    ]
                }
            ]
        }
        mock_scenario = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f503"),
            "disasterType": "Storm",
            "magnitude": 80.0,
            "country": "India",
            "iso": "IND"
        }
        
        self.mock_db.simulations.find_one = AsyncMock(side_effect=[mock_sim, mock_sim])
        self.mock_db.scenarios.find_one = AsyncMock(return_value=mock_scenario)
        self.mock_db.simulations.update_one = AsyncMock(return_value=None)
        self.mock_db.admin_audit_logs.insert_one = AsyncMock(return_value=None)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/simulations/60a4f5f5f5f5f5f5f5f5f504/progress", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.mock_db.simulations.update_one.called)
