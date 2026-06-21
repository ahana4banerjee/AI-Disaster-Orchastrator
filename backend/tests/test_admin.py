import os
import sys
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import status
from fastapi.testclient import TestClient

# Insert backend directory in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.security import create_access_token

class TestAdminAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.admin_token = create_access_token(data={"sub": "admin@earth.org", "role": "admin"})
        self.user_token = create_access_token(data={"sub": "user@earth.org", "role": "public_user"})

    @patch('app.api.v1.endpoints.auth.db_helper')
    @patch('app.api.v1.endpoints.admin.db_helper')
    def test_get_records_success(self, mock_admin_db_helper, mock_auth_db_helper):
        mock_db = MagicMock()
        mock_admin_db_helper.db = mock_db
        mock_auth_db_helper.db = mock_db
        
        # Mock auth find_one finding the admin user
        mock_db.users.find_one = AsyncMock(return_value={"email": "admin@earth.org", "role": "admin"})
        
        # Mock total document count
        mock_db.disaster_records.count_documents = AsyncMock(return_value=1)
        
        # Mock cursor find to return a record list
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
                "severityScore": 1.25,
                "severityClass": "Medium"
            }
        ]
        mock_cursor.sort.return_value.skip.return_value.limit.return_value.to_list = AsyncMock(return_value=mock_records)
        mock_db.disaster_records.find = MagicMock(return_value=mock_cursor)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.get("/api/v1/admin/records?page=1&limit=20", headers=headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(data["totalCount"], 1)
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["totalPages"], 1)
        self.assertEqual(data["data"][0]["disNo"], "2026-0153-KEN")

    @patch('app.api.v1.endpoints.auth.db_helper')
    @patch('app.api.v1.endpoints.admin.db_helper')
    def test_get_records_forbidden_for_public_user(self, mock_admin_db_helper, mock_auth_db_helper):
        mock_db = MagicMock()
        mock_admin_db_helper.db = mock_db
        mock_auth_db_helper.db = mock_db
        
        # Mock auth lookup finding a standard public user
        mock_db.users.find_one = AsyncMock(return_value={"email": "user@earth.org", "role": "public_user"})

        headers = {"Authorization": f"Bearer {self.user_token}"}
        response = self.client.get("/api/v1/admin/records", headers=headers)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("administrative accounts", response.json()["detail"])

    @patch('app.api.v1.endpoints.auth.db_helper')
    @patch('app.api.v1.endpoints.admin.db_helper')
    def test_create_record_success(self, mock_admin_db_helper, mock_auth_db_helper):
        mock_db = MagicMock()
        mock_admin_db_helper.db = mock_db
        mock_auth_db_helper.db = mock_db
        
        mock_db.users.find_one = AsyncMock(return_value={"_id": "60a4f5f5f5f5f5f5f5f5f500", "email": "admin@earth.org", "role": "admin"})
        mock_db.disaster_records.find_one = AsyncMock(return_value=None)
        
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = "60a4f5f5f5f5f5f5f5f5f501"
        mock_db.disaster_records.insert_one = AsyncMock(return_value=mock_insert_result)
        mock_db.audit_logs.insert_one = AsyncMock(return_value=None)

        payload = {
            "disNo": "2026-9999-IND",
            "disasterGroup": "Natural",
            "disasterSubgroup": "Hydrological",
            "disasterType": "Flood",
            "disasterSubtype": "Flash flood",
            "country": "India",
            "iso": "IND",
            "location": "Uttarakhand districts",
            "magnitude": 12.0,
            "magnitudeScale": "Km2",
            "geoJSON": {
                "type": "Point",
                "coordinates": [78.0322, 30.3165]
            },
            "startDate": "2026-06-15T00:00:00Z",
            "endDate": "2026-06-17T00:00:00Z",
            "impact": {
                "deaths": 12,
                "injured": 45,
                "totalAffected": 2500,
                "economicDamageUSD": 120000.0
            }
        }
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.post("/api/v1/admin/records", json=payload, headers=headers)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        data = response.json()
        self.assertEqual(data["disNo"], "2026-9999-IND")
        self.assertIn("severityScore", data)
        self.assertEqual(data["severityClass"], "High") # Calculated dynamically based on 12 deaths and 2500 affected
        self.assertTrue(mock_db.audit_logs.insert_one.called)

    @patch('app.api.v1.endpoints.auth.db_helper')
    @patch('app.api.v1.endpoints.admin.db_helper')
    def test_delete_record_success(self, mock_admin_db_helper, mock_auth_db_helper):
        from bson import ObjectId
        mock_db = MagicMock()
        mock_admin_db_helper.db = mock_db
        mock_auth_db_helper.db = mock_db
        
        mock_db.users.find_one = AsyncMock(return_value={"_id": "60a4f5f5f5f5f5f5f5f5f500", "email": "admin@earth.org", "role": "admin"})
        mock_db.disaster_records.find_one = AsyncMock(return_value={"disNo": "2026-0153-KEN"})
        mock_db.disaster_records.delete_one = AsyncMock(return_value=None)
        mock_db.audit_logs.insert_one = AsyncMock(return_value=None)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.delete("/api/v1/admin/records/60a4f5f5f5f5f5f5f5f5f501", headers=headers)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(mock_db.disaster_records.delete_one.called)
        self.assertTrue(mock_db.audit_logs.insert_one.called)

    @patch('app.api.v1.endpoints.auth.db_helper')
    @patch('app.api.v1.endpoints.admin.db_helper')
    def test_get_audit_logs_success(self, mock_admin_db_helper, mock_auth_db_helper):
        mock_db = MagicMock()
        mock_admin_db_helper.db = mock_db
        mock_auth_db_helper.db = mock_db
        
        mock_db.users.find_one = AsyncMock(return_value={"email": "admin@earth.org", "role": "admin"})
        
        mock_cursor = MagicMock()
        mock_logs = [
            {
                "_id": "60a4f5f5f5f5f5f5f5f5f507",
                "adminUserId": "60a4f5f5f5f5f5f5f5f5f500",
                "action": "CREATE_RECORD",
                "details": "Created disaster record: 2026-9999-IND",
                "timestamp": "2026-06-16T22:31:00"
            }
        ]
        mock_cursor.sort.return_value.limit.return_value.to_list = AsyncMock(return_value=mock_logs)
        mock_db.audit_logs.find = MagicMock(return_value=mock_cursor)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = self.client.get("/api/v1/admin/audit-logs?limit=50", headers=headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["action"], "CREATE_RECORD")

if __name__ == "__main__":
    unittest.main()
