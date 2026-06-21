import os
import sys
import unittest
from unittest.mock import MagicMock, AsyncMock
from fastapi.testclient import TestClient

# Insert backend directory in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import get_db

class TestAnalyticsAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.mock_db = MagicMock()
        app.dependency_overrides[get_db] = lambda: self.mock_db

    def tearDown(self):
        app.dependency_overrides.clear()

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
