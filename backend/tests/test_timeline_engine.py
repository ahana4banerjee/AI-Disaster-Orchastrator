import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.core.database import get_db
from app.services.timeline_engine import TimelineEngine

class TestTimelineEngineAPI(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.mock_db = MagicMock()
        self.admin_token = create_access_token(data={"sub": "admin@earth.org", "role": "admin"})
        app.dependency_overrides[get_db] = lambda: self.mock_db

    def tearDown(self):
        app.dependency_overrides.clear()

    @patch("httpx.AsyncClient.post")
    async def test_timeline_engine_heuristic_fallback(self, mock_post):
        # Verify heuristic fallback calculation works
        scenario = {
            "disasterType": "Storm",
            "magnitude": 10.0
        }
        res = await TimelineEngine.run_step_0(scenario)
        self.assertEqual(res["step"], 0)
        self.assertEqual(res["metrics"]["activeCasualties"], 3)  # mag * 0.3 = 3
        self.assertEqual(res["metrics"]["displacedPopulation"], 20000)  # mag * 2000 = 20000

    async def test_get_simulation_step_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin"
        })

        mock_sim = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "name": "Cyclone Mock Drill",
            "scenarioId": "60a4f5f5f5f5f5f5f5f5f503",
            "status": "Running",
            "timesteps": [
                {
                    "step": 0,
                    "timeLabel": "Hour 0: Landfall",
                    "status": "Active",
                    "metrics": {"activeCasualties": 12, "displacedPopulation": 450},
                    "infrastructureStates": {}
                }
            ]
        }
        self.mock_db.simulations.find_one = AsyncMock(return_value=mock_sim)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.get("/api/v1/simulations/60a4f5f5f5f5f5f5f5f5f504/steps/0", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["step"], 0)
        self.assertEqual(data["metrics"]["activeCasualties"], 12)

    async def test_get_simulation_step_not_found(self):
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin"
        })

        mock_sim = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "name": "Cyclone Mock Drill",
            "scenarioId": "60a4f5f5f5f5f5f5f5f5f503",
            "status": "Running",
            "timesteps": []
        }
        self.mock_db.simulations.find_one = AsyncMock(return_value=mock_sim)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.get("/api/v1/simulations/60a4f5f5f5f5f5f5f5f5f504/steps/0", headers=headers)
        self.assertEqual(response.status_code, 404)
        self.assertIn("is not computed yet", response.json()["detail"])
