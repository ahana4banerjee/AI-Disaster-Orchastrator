import os
import sys
import unittest
from unittest.mock import MagicMock, AsyncMock
from fastapi.testclient import TestClient

# Insert backend directory in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token

class TestAnalyticsAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.mock_db = MagicMock()
        app.dependency_overrides[get_db] = lambda: self.mock_db
        self.token = create_access_token(data={"sub": "user@earth.org", "role": "public_user"})

    def tearDown(self):
        app.dependency_overrides.clear()

    # ------------------ Dashboard KPIs Tests ------------------
    def test_get_dashboard_kpis_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"email": "user@earth.org", "role": "public_user"})
        
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=[
            {
                "totalEvents": 10,
                "highRiskEvents": 3,
                "averageDeaths": 12.4,
                "averageDamageUSD": 150000.5
            }
        ])
        self.mock_db.disaster_records.aggregate.return_value = mock_cursor

        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/api/v1/analytics/dashboard?country=India", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["totalEvents"], 10)
        self.assertEqual(data["highRiskEvents"], 3)
        self.assertEqual(data["averageDeaths"], 12.4)
        self.assertEqual(data["averageDamageUSD"], 150000.5)

    def test_get_dashboard_kpis_no_data(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"email": "user@earth.org", "role": "public_user"})
        
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=[])
        self.mock_db.disaster_records.aggregate.return_value = mock_cursor

        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/api/v1/analytics/dashboard", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["totalEvents"], 0)
        self.assertEqual(data["highRiskEvents"], 0)
        self.assertEqual(data["averageDeaths"], 0.0)
        self.assertEqual(data["averageDamageUSD"], 0.0)

    def test_get_dashboard_kpis_unauthorized(self):
        response = self.client.get("/api/v1/analytics/dashboard")
        self.assertEqual(response.status_code, 401)

    # ------------------ Trends Tests ------------------
    def test_get_trends_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"email": "user@earth.org", "role": "public_user"})
        
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=[
            {
                "year": 2025,
                "eventCount": 5,
                "averageDamageUSD": 120000.0
            }
        ])
        self.mock_db.disaster_records.aggregate.return_value = mock_cursor

        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/api/v1/analytics/trends?disasterType=Storm", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["year"], 2025)
        self.assertEqual(data[0]["eventCount"], 5)
        self.assertEqual(data[0]["averageDamageUSD"], 120000.0)

    def test_get_trends_unauthorized(self):
        response = self.client.get("/api/v1/analytics/trends")
        self.assertEqual(response.status_code, 401)

    # ------------------ Spatial Tests ------------------
    def test_get_spatial_lookups_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"email": "user@earth.org", "role": "public_user"})
        
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=[
            {
                "disNo": "2025-0303-ECU",
                "disasterType": "Earthquake",
                "distanceKm": 124.5,
                "deaths": 2
            }
        ])
        self.mock_db.disaster_records.aggregate.return_value = mock_cursor

        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/api/v1/analytics/spatial?longitude=78.0&latitude=30.0&radiusKm=200.0", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["disNo"], "2025-0303-ECU")
        self.assertEqual(data[0]["distanceKm"], 124.5)
        self.assertEqual(data[0]["deaths"], 2)

        # Verify the pipeline parameters
        args, kwargs = self.mock_db.disaster_records.aggregate.call_args
        pipeline = args[0]
        self.assertEqual(pipeline[0]["$geoNear"]["near"]["coordinates"], [78.0, 30.0])
        self.assertEqual(pipeline[0]["$geoNear"]["maxDistance"], 200.0 * 1000.0)

    def test_get_spatial_lookups_invalid_coordinates(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"email": "user@earth.org", "role": "public_user"})
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = self.client.get("/api/v1/analytics/spatial?longitude=190.0&latitude=30.0", headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Longitude must be between -180 and 180", response.json()["detail"])

        response = self.client.get("/api/v1/analytics/spatial?longitude=78.0&latitude=100.0", headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Latitude must be between -90 and 90", response.json()["detail"])

        response = self.client.get("/api/v1/analytics/spatial?longitude=78.0&latitude=30.0&radiusKm=-10", headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("radiusKm must be positive", response.json()["detail"])

    def test_get_spatial_lookups_unauthorized(self):
        response = self.client.get("/api/v1/analytics/spatial?longitude=78.0&latitude=30.0")
        self.assertEqual(response.status_code, 401)

    # ------------------ Regional Risk Tests ------------------
    def test_get_all_regional_risks_success(self):
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=[
            {
                "_id": "60a4f5f5f5f5f5f5f5f5f506",
                "subregion": "Southern Asia",
                "frequency": 3.42,
                "mortalityRate": 0.00045,
                "economicRisk": 0.0012,
                "maxMagnitude": 7.8,
                "clusterId": 3,
                "riskTier": "Extreme",
                "updatedAt": "2026-06-19T23:39:58"
            }
        ])
        self.mock_db.regional_risk_clusters.find.return_value = mock_cursor

        response = self.client.get("/api/v1/analytics/regional-risk")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["subregion"], "Southern Asia")
        self.assertEqual(data[0]["riskTier"], "Extreme")
        self.assertEqual(data[0]["_id"], "60a4f5f5f5f5f5f5f5f5f506")

    def test_get_regional_risk_by_subregion_success(self):
        mock_doc = {
            "_id": "60a4f5f5f5f5f5f5f5f5f506",
            "subregion": "Southern Asia",
            "frequency": 3.42,
            "mortalityRate": 0.00045,
            "economicRisk": 0.0012,
            "maxMagnitude": 7.8,
            "clusterId": 3,
            "riskTier": "Extreme",
            "updatedAt": "2026-06-19T23:39:58"
        }
        self.mock_db.regional_risk_clusters.find_one = AsyncMock(return_value=mock_doc)

        response = self.client.get("/api/v1/analytics/regional-risk/Southern%20Asia")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["subregion"], "Southern Asia")
        self.assertEqual(data["riskTier"], "Extreme")

    def test_get_regional_risk_by_subregion_not_found(self):
        self.mock_db.regional_risk_clusters.find_one = AsyncMock(return_value=None)

        response = self.client.get("/api/v1/analytics/regional-risk/NonExistent")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Regional risk cluster data not found for subregion 'NonExistent'")

if __name__ == "__main__":
    unittest.main()
