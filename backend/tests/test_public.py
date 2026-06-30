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
