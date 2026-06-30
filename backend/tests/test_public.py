import os
import sys
import unittest
from unittest.mock import MagicMock, AsyncMock
from fastapi.testclient import TestClient

# Insert backend directory in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import get_db

class TestPublicAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.mock_db = MagicMock()
        app.dependency_overrides[get_db] = lambda: self.mock_db

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_get_public_disasters_success(self):
        # Mock document counting
        self.mock_db.disaster_records.count_documents = AsyncMock(return_value=1)
        
        # Mock cursor find to return records list
        mock_cursor = MagicMock()
        mock_records = [
            {
                "_id": "60a4f5f5f5f5f5f5f5f5f501",
                "disNo": "2026-0153-KEN",
                "disasterGroup": "Natural",
                "disasterType": "Flood",
                "country": "Kenya",
                "iso": "KEN",
                "startDate": "2026-03-06T00:00:00",
                "impact": {
                    "deaths": 59,
                    "injured": 10,
                    "affected": 100,
                    "homeless": 0,
                    "totalAffected": 110,
                    "economicDamageUSD": 5000.0
                },
                "geoJSON": {
                    "type": "Point",
                    "coordinates": [39.66, -4.04]
                }
            }
        ]
        mock_cursor.to_list = AsyncMock(return_value=mock_records)
        self.mock_db.disaster_records.find.return_value.sort.return_value.skip.return_value.limit = MagicMock(return_value=mock_cursor)
        
        # Call the non-auth endpoint
        response = self.client.get("/api/v1/public/disasters?page=1&limit=10&country=Kenya")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertEqual(data["totalCount"], 1)
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["totalPages"], 1)
        self.assertEqual(len(data["data"]), 1)
        self.assertEqual(data["data"][0]["disNo"], "2026-0153-KEN")
        self.assertEqual(data["data"][0]["country"], "Kenya")
        
        # Verify no authorization check was triggered
        self.mock_db.users.find_one.assert_not_called()

    def test_get_public_disasters_invalid_limit(self):
        # Limit must be le 50 (restricted in router validation)
        response = self.client.get("/api/v1/public/disasters?limit=100")
        self.assertEqual(response.status_code, 422) # Unprocessable Entity

    def test_get_public_nearby_disasters_success(self):
        mock_cursor = MagicMock()
        mock_results = [
            {
                "disNo": "2026-0153-KEN",
                "disasterType": "Flood",
                "distanceKm": 12.45,
                "deaths": 59
            }
        ]
        mock_cursor.to_list = AsyncMock(return_value=mock_results)
        self.mock_db.disaster_records.aggregate.return_value = mock_cursor

        response = self.client.get("/api/v1/public/disasters/nearby?longitude=39.66&latitude=-4.04&radiusKm=500&limit=5")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["disNo"], "2026-0153-KEN")
        self.assertEqual(data[0]["distanceKm"], 12.45)

    def test_get_public_nearby_disasters_invalid_coordinates(self):
        # Latitude must be <= 90
        response = self.client.get("/api/v1/public/disasters/nearby?longitude=39.66&latitude=95.0")
        self.assertEqual(response.status_code, 422)

        # Longitude must be >= -180
        response = self.client.get("/api/v1/public/disasters/nearby?longitude=-185.0&latitude=10.0")
        self.assertEqual(response.status_code, 422)

    def test_get_public_risk_checker_success(self):
        mock_cursor = MagicMock()
        mock_records = [
            {
                "disNo": "2026-0001-KEN",
                "disasterType": "Flood",
                "country": "Kenya",
                "location": "Mombasa",
                "severityClass": "High",
                "impact": {
                    "deaths": 10,
                    "economicDamageUSD": 100000.0
                }
            }
        ]
        mock_cursor.to_list = AsyncMock(return_value=mock_records)
        self.mock_db.disaster_records.find.return_value = mock_cursor

        response = self.client.get("/api/v1/public/risk-checker?country=Kenya&region=Mombasa")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["country"], "Kenya")
        self.assertEqual(data["region"], "Mombasa")
        self.assertEqual(data["totalEvents"], 1)
        self.assertEqual(data["riskLevel"], "High")
        self.assertEqual(len(data["topThreats"]), 1)
        self.assertEqual(data["topThreats"][0]["disasterType"], "Flood")

    def test_get_public_risk_checker_missing_country(self):
        response = self.client.get("/api/v1/public/risk-checker")
        self.assertEqual(response.status_code, 422) # Missing parameter query

    def test_get_public_awareness_all_success(self):
        mock_cursor = MagicMock()
        mock_guides = [
            {
                "hazard": "flood",
                "description": "Flood description",
                "warningSigns": ["rises"],
                "before": ["prep"],
                "during": ["evac"],
                "after": ["clean"],
                "resources": []
            }
        ]
        mock_cursor.to_list = AsyncMock(return_value=mock_guides)
        self.mock_db.disaster_awareness.find.return_value = mock_cursor
        self.mock_db.disaster_awareness.count_documents = AsyncMock(return_value=1)

        response = self.client.get("/api/v1/public/awareness")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data) >= 1)
        self.assertEqual(data[0]["hazard"], "flood")

    def test_get_public_awareness_by_hazard_not_found(self):
        self.mock_db.disaster_awareness.find_one = AsyncMock(return_value=None)
        self.mock_db.disaster_awareness.count_documents = AsyncMock(return_value=1)

        response = self.client.get("/api/v1/public/awareness/unknown_hazard")
        self.assertEqual(response.status_code, 404)

    def test_get_preparedness_checklist_success(self):
        self.mock_db.disaster_awareness.find_one = AsyncMock(return_value={
            "hazard": "flood",
            "description": "desc",
            "warningSigns": [],
            "before": ["action"],
            "during": ["during"],
            "after": [],
            "resources": []
        })
        self.mock_db.disaster_records.count_documents = AsyncMock(return_value=10)

        response = self.client.get("/api/v1/public/preparedness/checklist?country=Kenya&disasterType=Flood")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data) >= 7) # 6 essentials + hazard actions + country info
        self.assertEqual(data[0]["category"], "Supplies")
        self.assertEqual(data[-1]["category"], "Regional Info")
        self.assertEqual(data[-1]["priority"], "Critical")

    def test_get_preparedness_checklist_missing_params(self):
        response = self.client.get("/api/v1/public/preparedness/checklist?country=Kenya")
        self.assertEqual(response.status_code, 422)




