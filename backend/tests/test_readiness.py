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

class TestReadinessAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.mock_db = MagicMock()
        app.dependency_overrides[get_db] = lambda: self.mock_db
        self.token = create_access_token(data={"sub": "user@earth.org", "role": "public_user"})

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_get_readiness_profile_unauthorized(self):
        response = self.client.get("/api/v1/public/readiness")
        self.assertEqual(response.status_code, 401)

    def test_get_readiness_profile_success(self):
        # Mock current user database lookup
        self.mock_db.users.find_one = AsyncMock(return_value={"_id": "60a4f5f5f5f5f5f5f5f5f501", "email": "user@earth.org", "role": "public_user"})
        # Mock readiness_profiles lookup (none exists yet -> gets created)
        self.mock_db.readiness_profiles.find_one = AsyncMock(return_value=None)
        self.mock_db.readiness_profiles.insert_one = AsyncMock(return_value=None)

        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/api/v1/public/readiness", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["userId"], "60a4f5f5f5f5f5f5f5f5f501")
        self.assertEqual(data["score"], 0)
        self.assertEqual(data["checkedItems"], [])

    def test_update_readiness_profile_success(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"_id": "60a4f5f5f5f5f5f5f5f5f501", "email": "user@earth.org", "role": "public_user"})
        
        # Mock find_one_and_update returning updated doc
        updated_profile = {
            "userId": "60a4f5f5f5f5f5f5f5f5f501",
            "checkedItems": ["water_3_days", "food_3_days"],
            "score": 20, # 2 out of 10 matches
            "updatedAt": "2026-07-01T00:00:00"
        }
        self.mock_db.readiness_profiles.find_one_and_update = AsyncMock(return_value=updated_profile)

        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {"checkedItems": ["water_3_days", "food_3_days"]}
        response = self.client.put("/api/v1/public/readiness", json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["userId"], "60a4f5f5f5f5f5f5f5f5f501")
        self.assertEqual(data["score"], 20)
        self.assertEqual(data["checkedItems"], ["water_3_days", "food_3_days"])
