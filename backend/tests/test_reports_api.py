import time
import unittest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from bson import ObjectId
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.security import create_access_token
from app.main import app
from app.services.report_generator import ReportGenerator


class TestReportsPhase7(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.mock_db = MagicMock()
        self.admin_token = create_access_token(data={"sub": "admin@earth.org", "role": "admin"})
        self.admin2_token = create_access_token(data={"sub": "admin2@earth.org", "role": "admin"})
        self.public_token = create_access_token(data={"sub": "citizen@earth.org", "role": "public_user"})
        app.dependency_overrides[get_db] = lambda: self.mock_db

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_incomplete_simulation_and_missing_resource_plan(self):
        sim = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "name": "Active Drill <script>alert(1)</script>",
            "status": "Running",
            "createdAt": datetime.now(timezone.utc),
            "timesteps": [
                {
                    "step": 0,
                    "timeLabel": "Hour 0: Landfall",
                    "status": "Active",
                    "narrative": "Landfall observed.",
                    "metrics": {"activeCasualties": 15, "displacedPopulation": 1200, "structuralDamagePercentage": 10.0},
                    "infrastructureStates": [{"name": "Power Grid", "status": "Degraded"}],
                }
            ],
        }
        snap = ReportGenerator.compile_snapshot(
            simulation=sim,
            scenario=None,
            resource_plan=None,
            compiled_by="60a4f5f5f5f5f5f5f5f5f500",
            compiled_by_email="admin@earth.org",
            version=1,
            title="<b>SitRep</b> Test",
        )
        self.assertEqual(snap["simulationStatus"], "Running")
        self.assertTrue(snap["scenarioMissing"])
        self.assertEqual(snap["resourcePlanStatus"], "Missing")
        self.assertEqual(len(snap["executedTimesteps"]), 1)
        self.assertEqual(len(snap["pendingTimesteps"]), 4)
        self.assertEqual(snap["title"], "SitRep Test")
        self.assertNotIn("<script>", snap["simulationName"])

        md = ReportGenerator.render_markdown(snap)
        self.assertIn("Methodology & Data Sources (AI Transparency)", md)
        self.assertIn("Not yet executed / Unavailable", md)
        self.assertIn("Missing", md)

        csv_out = ReportGenerator.render_csv(snap)
        self.assertIn("Timeline,H0", csv_out)
        self.assertIn("Not yet executed / Unavailable", csv_out)

    def test_zero_deficit_distinguished_from_missing_and_pdf_speed(self):
        sim = {
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f504"),
            "name": "Completed Drill",
            "status": "Completed",
            "createdAt": datetime.now(timezone.utc),
            "timesteps": [
                {
                    "step": i,
                    "timeLabel": f"Hour {h}: Phase",
                    "status": "Active",
                    "narrative": f"Step {i} narrative.",
                    "metrics": {"activeCasualties": 10 + i * 5, "displacedPopulation": 1000, "structuralDamagePercentage": 15.0},
                    "infrastructureStates": [{"name": "Power Grid", "status": "Operational"}],
                }
                for i, h in [(0, 0), (1, 6), (2, 12), (3, 24), (4, 48)]
            ],
        }
        res_plan = {
            "summary": {"totalRequired": 50, "totalAvailable": 100, "totalDeficit": 0},
            "resources": [
                {
                    "key": "ambulances",
                    "type": "Ambulances",
                    "required": 20,
                    "available": 35,
                    "deficit": 0,
                    "deficitPercentage": 0.0,
                    "status": "Sufficient",
                    "statusColor": "EMERALD",
                    "infrastructureFactor": None,
                }
            ],
            "criticalAlerts": [],
            "deficitAnalysisSummary": "All stockpiles sufficient.",
        }
        snap = ReportGenerator.compile_snapshot(
            simulation=sim,
            scenario={"name": "Odisha Cyclone", "disasterType": "Storm", "country": "India", "magnitude": 220.0, "magnitudeScale": "Kph"},
            resource_plan=res_plan,
            compiled_by="60a4f5f5f5f5f5f5f5f5f500",
            compiled_by_email="admin@earth.org",
            version=2,
            title="Completed SitRep",
        )
        self.assertEqual(snap["resourcePlanStatus"], "Available (Zero Deficits)")
        self.assertEqual(len(snap["pendingTimesteps"]), 0)

        t0 = time.perf_counter()
        pdf_bytes = ReportGenerator.render_pdf_bytes(snap)
        elapsed = time.perf_counter() - t0
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))
        self.assertLess(elapsed, 3.0)

    def test_compile_list_detail_exports_delete_and_rbac(self):
        sim_id = "60a4f5f5f5f5f5f5f5f5f504"
        scen_id = "60a4f5f5f5f5f5f5f5f5f503"
        rep_id = ObjectId("60a4f5f5f5f5f5f5f5f5f508")

        # 1. Non-admin forbidden
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f599"),
            "email": "citizen@earth.org",
            "role": "public_user",
        })
        res_403 = self.client.get("/api/v1/reports/", headers={"Authorization": f"Bearer {self.public_token}"})
        self.assertEqual(res_403.status_code, 403)
        res_401 = self.client.get("/api/v1/reports/")
        self.assertEqual(res_401.status_code, 401)

        # 2. Admin compiles report
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin",
        })
        self.mock_db.simulations.find_one = AsyncMock(return_value={
            "_id": ObjectId(sim_id),
            "scenarioId": ObjectId(scen_id),
            "name": "Cyclone Odisha Test",
            "status": "Completed",
            "createdAt": datetime.now(timezone.utc),
            "timesteps": [
                {
                    "step": 0,
                    "timeLabel": "Hour 0: Landfall",
                    "status": "Active",
                    "narrative": "Initial impact.",
                    "metrics": {"activeCasualties": 40, "displacedPopulation": 5000, "structuralDamagePercentage": 20.0},
                    "infrastructureStates": [{"name": "Power Grid", "status": "Failed"}],
                }
            ],
        })
        self.mock_db.scenarios.find_one = AsyncMock(return_value={
            "_id": ObjectId(scen_id),
            "name": "Odisha Baseline",
            "disasterType": "Storm",
            "country": "India",
            "magnitude": 220.0,
            "magnitudeScale": "Kph",
        })
        self.mock_db.resource_plans.find_one = AsyncMock(return_value=None)
        self.mock_db.ai_reports.count_documents = AsyncMock(return_value=0)

        saved_docs = []

        async def mock_insert(doc):
            doc["_id"] = rep_id
            saved_docs.append(dict(doc))
            m = MagicMock()
            m.inserted_id = rep_id
            return m

        self.mock_db.ai_reports.insert_one = AsyncMock(side_effect=mock_insert)
        self.mock_db.ai_reports.update_one = AsyncMock(return_value=None)
        self.mock_db.admin_audit_logs.insert_one = AsyncMock(return_value=None)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        create_res = self.client.post(
            "/api/v1/reports/",
            json={"simulationId": sim_id, "title": "SITREP Odisha"},
            headers=headers,
        )
        self.assertEqual(create_res.status_code, 201)
        created = create_res.json()
        self.assertEqual(created["version"], 1)
        self.assertTrue(created["reportCode"].startswith("SITREP-"))
        self.assertEqual(len(saved_docs), 1)

        # 3. Another authenticated admin can list, view, download PDF/MD/CSV, and delete
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f501"),
            "email": "admin2@earth.org",
            "role": "admin",
        })
        headers2 = {"Authorization": f"Bearer {self.admin2_token}"}

        stored = saved_docs[0]
        self.mock_db.ai_reports.find_one = AsyncMock(return_value=stored)

        pdf_res = self.client.get(f"/api/v1/reports/{rep_id}/pdf", headers=headers2)
        self.assertEqual(pdf_res.status_code, 200)
        self.assertEqual(pdf_res.headers["content-type"], "application/pdf")
        self.assertTrue(pdf_res.content.startswith(b"%PDF-"))

        md_res = self.client.get(f"/api/v1/reports/{rep_id}/markdown", headers=headers2)
        self.assertEqual(md_res.status_code, 200)
        self.assertIn("SITREP Odisha", md_res.text)

        csv_res = self.client.get(f"/api/v1/reports/{rep_id}/csv", headers=headers2)
        self.assertEqual(csv_res.status_code, 200)
        self.assertIn("Section,StepOrKey", csv_res.text)

        self.mock_db.ai_reports.delete_one = AsyncMock(return_value=None)
        del_res = self.client.delete(f"/api/v1/reports/{rep_id}", headers=headers2)
        self.assertEqual(del_res.status_code, 204)

    def test_pdf_failure_prevents_db_persistence(self):
        sim_id = "60a4f5f5f5f5f5f5f5f5f504"
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f500"),
            "email": "admin@earth.org",
            "role": "admin",
        })
        self.mock_db.simulations.find_one = AsyncMock(return_value={
            "_id": ObjectId(sim_id),
            "name": "Test",
            "status": "Running",
            "timesteps": [],
        })
        self.mock_db.resource_plans.find_one = AsyncMock(return_value=None)
        self.mock_db.ai_reports.count_documents = AsyncMock(return_value=0)
        self.mock_db.ai_reports.insert_one = AsyncMock()

        with patch("app.services.report_generator.ReportGenerator.render_pdf_bytes", side_effect=RuntimeError("PDF boom")):
            res = self.client.post(
                "/api/v1/reports/",
                json={"simulationId": sim_id, "title": "Fail Test"},
                headers={"Authorization": f"Bearer {self.admin_token}"},
            )
            self.assertEqual(res.status_code, 500)
            self.assertFalse(self.mock_db.ai_reports.insert_one.called)
