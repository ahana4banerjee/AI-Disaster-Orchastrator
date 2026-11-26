import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from bson import ObjectId
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token
from app.core.database import get_db
from app.models.schemas.resource import ResourceInventory
from app.services.resource_engine import ResourceEngine


class TestResourceEngineAndAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.mock_db = MagicMock()
        self.admin_token = create_access_token(data={"sub": "admin@earth.org", "role": "admin"})
        self.public_token = create_access_token(data={"sub": "citizen@earth.org", "role": "public_user"})
        app.dependency_overrides[get_db] = lambda: self.mock_db

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_baseline_resource_calculation_and_classification(self):
        scenario = {"disasterType": "Storm", "magnitude": 220.0}
        timestep = {
            "step": 0,
            "timeLabel": "Hour 0: Landfall",
            "metrics": {
                "activeCasualties": 200,
                "displacedPopulation": 5000,
                "structuralDamagePercentage": 15.0,
            },
            "infrastructureStates": [
                {"name": "Power Grid", "status": "Operational"},
                {"name": "Road Network", "status": "Operational"},
                {"name": "Hospitals", "status": "Operational"},
                {"name": "Water Supply", "status": "Operational"},
            ],
        }
        inventory = ResourceInventory(
            ambulances=100,   # sufficient (0.02*5000 = 100)
            rescueTeams=50,   # sufficient
            medicalTeams=1,   # critical if req >= 2 (0.01*200 = 2 -> deficit 1, 50% -> CRIMSON)
            reliefCamps=3,    # sufficient (ceil(1250/500) = 3)
            foodUnits=5000,   # moderate (ceil(1.2*5000) = 6000 -> deficit 1000, 16.7% -> AMBER)
        )
        result = ResourceEngine.calculate_timestep_resources(scenario, timestep, inventory)
        by_key = {r["key"]: r for r in result["resources"]}

        self.assertEqual(by_key["ambulances"]["required"], 100)
        self.assertEqual(by_key["ambulances"]["deficit"], 0)
        self.assertEqual(by_key["ambulances"]["statusColor"], "EMERALD")

        self.assertEqual(by_key["medicalTeams"]["required"], 2)
        self.assertEqual(by_key["medicalTeams"]["deficit"], 1)
        self.assertEqual(by_key["medicalTeams"]["statusColor"], "CRIMSON")

        self.assertEqual(by_key["foodUnits"]["required"], 6000)
        self.assertEqual(by_key["foodUnits"]["deficit"], 1000)
        self.assertEqual(by_key["foodUnits"]["statusColor"], "AMBER")

        self.assertEqual(result["summary"]["criticalCount"], 1)
        self.assertEqual(result["summary"]["moderateCount"], 1)
        self.assertEqual(result["summary"]["sufficientCount"], 3)

    def test_infrastructure_disruption_increases_requirements(self):
        scenario = {"disasterType": "Storm", "magnitude": 220.0}
        base_step = {
            "step": 2,
            "timeLabel": "Hour 12: Transportation Corridors",
            "metrics": {
                "activeCasualties": 500,
                "displacedPopulation": 4000,
                "structuralDamagePercentage": 30.0,
            },
            "infrastructureStates": [
                {"name": "Power Grid", "status": "Operational"},
                {"name": "Road Network", "status": "Operational"},
                {"name": "Hospitals", "status": "Operational"},
                {"name": "Water Supply", "status": "Operational"},
            ],
        }
        failed_step = {
            **base_step,
            "infrastructureStates": [
                {"name": "Power Grid", "status": "Failed"},
                {"name": "Road Network", "status": "Failed"},
                {"name": "Hospitals", "status": "Critical"},
                {"name": "Water Supply", "status": "Failed"},
            ],
        }

        base_res = {r["key"]: r for r in ResourceEngine.calculate_timestep_resources(scenario, base_step)["resources"]}
        fail_res = {r["key"]: r for r in ResourceEngine.calculate_timestep_resources(scenario, failed_step)["resources"]}

        self.assertGreater(fail_res["ambulances"]["required"], base_res["ambulances"]["required"])
        self.assertGreater(fail_res["medicalTeams"]["required"], base_res["medicalTeams"]["required"])
        self.assertGreater(fail_res["foodUnits"]["required"], base_res["foodUnits"]["required"])
        self.assertIsNotNone(fail_res["ambulances"]["infrastructureFactor"])
        self.assertIn("Road Network Failed", fail_res["ambulances"]["infrastructureFactor"])

    def test_admin_authorization_required_on_resource_endpoints(self):
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f599"),
            "email": "citizen@earth.org",
            "role": "public_user",
        })
        headers = {"Authorization": f"Bearer {self.public_token}"}
        res = self.client.get("/api/v1/resources/simulations/60a4f5f5f5f5f5f5f5f5f504", headers=headers)
        self.assertEqual(res.status_code, 403)

        unauth = self.client.get("/api/v1/resources/simulations/60a4f5f5f5f5f5f5f5f5f504")
        self.assertEqual(unauth.status_code, 401)

    def test_get_resource_plan_and_update_inventory(self):
        sim_id = "60a4f5f5f5f5f5f5f5f5f504"
        scen_id = "60a4f5f5f5f5f5f5f5f5f503"
        plan_id = ObjectId("60a4f5f5f5f5f5f5f5f5f555")

        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin",
        })

        mock_sim = {
            "_id": ObjectId(sim_id),
            "scenarioId": ObjectId(scen_id),
            "name": "Cyclone Odisha Test",
            "status": "Completed",
            "currentStep": 4,
            "timesteps": [
                {
                    "step": 0,
                    "timeLabel": "Hour 0: Landfall",
                    "metrics": {"activeCasualties": 100, "displacedPopulation": 2000, "structuralDamagePercentage": 10.0},
                    "infrastructureStates": [{"name": "Power Grid", "status": "Operational"}],
                },
                {
                    "step": 4,
                    "timeLabel": "Hour 48: Recovery Thresholds",
                    "metrics": {"activeCasualties": 250, "displacedPopulation": 6000, "structuralDamagePercentage": 35.0},
                    "infrastructureStates": [{"name": "Road Network", "status": "Degraded"}],
                },
            ],
        }
        mock_scenario = {"_id": ObjectId(scen_id), "disasterType": "Storm", "magnitude": 200.0}

        # First call to GET generates the plan because resource_plans.find_one returns None
        self.mock_db.resource_plans.find_one = AsyncMock(return_value=None)
        self.mock_db.simulations.find_one = AsyncMock(return_value=mock_sim)
        self.mock_db.scenarios.find_one = AsyncMock(return_value=mock_scenario)
        insert_res = MagicMock()
        insert_res.inserted_id = plan_id
        self.mock_db.resource_plans.insert_one = AsyncMock(return_value=insert_res)
        self.mock_db.admin_audit_logs.insert_one = AsyncMock(return_value=None)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        get_res = self.client.get(f"/api/v1/resources/simulations/{sim_id}", headers=headers)
        self.assertEqual(get_res.status_code, 200)
        body = get_res.json()
        self.assertEqual(body["status"], "Finalized")
        self.assertEqual(len(body["timestepAssessments"]), 2)
        self.assertEqual(len(body["resources"]), 5)

        # Now test PUT inventory recalculation
        with patch("app.api.v1.endpoints.resources.manager.broadcast", new_callable=AsyncMock) as mock_ws:
            self.mock_db.resource_plans.find_one = AsyncMock(return_value={"_id": plan_id, "simulationId": sim_id})
            self.mock_db.resource_plans.update_one = AsyncMock(return_value=None)

            new_inv = {
                "ambulances": 500,
                "rescueTeams": 100,
                "medicalTeams": 100,
                "reliefCamps": 100,
                "foodUnits": 100000,
            }
            put_res = self.client.put(
                f"/api/v1/resources/simulations/{sim_id}/inventory",
                json=new_inv,
                headers=headers,
            )
            self.assertEqual(put_res.status_code, 200)
            put_body = put_res.json()
            self.assertEqual(put_body["summary"]["totalDeficit"], 0)
            self.assertEqual(put_body["summary"]["criticalCount"], 0)
            self.assertTrue(mock_ws.called)
            ws_msg = mock_ws.call_args[0][1]
            self.assertEqual(ws_msg["type"], "RESOURCE_UPDATE")

    def test_simulation_progress_broadcasts_resource_events(self):
        sim_id = "60a4f5f5f5f5f5f5f5f5f504"
        scen_id = "60a4f5f5f5f5f5f5f5f5f503"
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin",
        })
        mock_sim = {
            "_id": ObjectId(sim_id),
            "scenarioId": ObjectId(scen_id),
            "name": "Storm Sim",
            "createdBy": "60a4f5f5f5f5f5f5f5f5f500",
            "status": "Running",
            "createdAt": datetime.utcnow(),
            "currentStep": 3,
            "timesteps": [
                {"step": 0, "timeLabel": "Hour 0", "status": "Active", "metrics": {}, "infrastructureStates": []},
                {"step": 1, "timeLabel": "Hour 6", "status": "Active", "metrics": {}, "infrastructureStates": []},
                {"step": 2, "timeLabel": "Hour 12", "status": "Active", "metrics": {}, "infrastructureStates": []},
                {
                    "step": 3,
                    "timeLabel": "Hour 24: Healthcare Stress",
                    "status": "Active",
                    "metrics": {"activeCasualties": 50, "displacedPopulation": 2000, "structuralDamagePercentage": 25.0},
                    "infrastructureStates": [{"name": "Power Grid", "status": "Failed"}],
                },
            ],
        }
        mock_scenario = {"_id": ObjectId(scen_id), "disasterType": "Storm", "magnitude": 120.0, "country": "India"}

        self.mock_db.simulations.find_one = AsyncMock(side_effect=[mock_sim, mock_sim])
        self.mock_db.scenarios.find_one = AsyncMock(return_value=mock_scenario)
        self.mock_db.simulations.update_one = AsyncMock(return_value=None)
        self.mock_db.admin_audit_logs.insert_one = AsyncMock(return_value=None)
        self.mock_db.resource_plans.find_one = AsyncMock(return_value=None)
        self.mock_db.resource_inventories.find_one = AsyncMock(return_value=None)
        insert_res = MagicMock()
        insert_res.inserted_id = ObjectId()
        self.mock_db.resource_plans.insert_one = AsyncMock(return_value=insert_res)

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, \
             patch("app.core.websocket.manager.broadcast", new_callable=AsyncMock) as mock_ws:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = [{"deaths": 40, "affectedPopulation": 5000, "magnitude": 120.0}]
            mock_post.return_value = mock_resp

            headers = {"Authorization": f"Bearer {self.admin_token}"}
            res = self.client.post(f"/api/v1/simulations/{sim_id}/progress", headers=headers)
            self.assertEqual(res.status_code, 200)
            event_types = [call[0][1]["type"] for call in mock_ws.call_args_list]
            self.assertIn("TIMESTEP_UPDATE", event_types)
            self.assertIn("RESOURCE_UPDATE", event_types)
            self.assertIn("RESOURCE_FINALIZED", event_types)
            self.assertIn("SIMULATION_COMPLETED", event_types)
