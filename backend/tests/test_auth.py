import os
import sys
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import status
from fastapi.testclient import TestClient

# Insert backend directory in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

class TestAuthAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch('app.api.v1.endpoints.auth.db_helper')
    def test_register_user_success(self, mock_db_helper):
        mock_db = MagicMock()
        mock_db_helper.db = mock_db
        
        # Mock database lookup finding no existing user
        mock_db.users.find_one = AsyncMock(return_value=None)
        
        # Mock insert_one returning an object with inserted_id
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = "60a4f5f5f5f5f5f5f5f5f500"
        mock_db.users.insert_one = AsyncMock(return_value=mock_insert_result)

        payload = {
            "email": "citizen.prepared@earth.org",
            "password": "SecurePassword123!",
            "role": "public_user"
        }
        
        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["email"], payload["email"])
        self.assertEqual(data["role"], "public_user")
        self.assertEqual(data["_id"], "60a4f5f5f5f5f5f5f5f5f500")

    @patch('app.api.v1.endpoints.auth.db_helper')
    def test_register_user_duplicate_email(self, mock_db_helper):
        mock_db = MagicMock()
        mock_db_helper.db = mock_db
        
        # Mock database lookup finding an existing user
        mock_db.users.find_one = AsyncMock(return_value={"email": "duplicate@earth.org"})

        payload = {
            "email": "duplicate@earth.org",
            "password": "SecurePassword123!",
            "role": "public_user"
        }
        
        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already exists", response.json()["detail"])

    @patch('app.api.v1.endpoints.auth.db_helper')
    def test_login_success(self, mock_db_helper):
        from app.core.security import get_password_hash
        mock_db = MagicMock()
        mock_db_helper.db = mock_db
        
        # Mock database lookup finding the user
        hashed_password = get_password_hash("CorrectPassword123!")
        mock_user = {
            "email": "valid@earth.org",
            "password": hashed_password,
            "role": "admin",
            "isActive": True
        }
        mock_db.users.find_one = AsyncMock(return_value=mock_user)

        response = self.client.post(
            "/api/v1/auth/login",
            data={"username": "valid@earth.org", "password": "CorrectPassword123!"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["role"], "admin")
        self.assertEqual(data["token_type"], "bearer")

    @patch('app.api.v1.endpoints.auth.db_helper')
    def test_login_incorrect_password(self, mock_db_helper):
        from app.core.security import get_password_hash
        mock_db = MagicMock()
        mock_db_helper.db = mock_db
        
        hashed_password = get_password_hash("CorrectPassword123!")
        mock_user = {
            "email": "valid@earth.org",
            "password": hashed_password,
            "role": "admin"
        }
        mock_db.users.find_one = AsyncMock(return_value=mock_user)

        response = self.client.post(
            "/api/v1/auth/login",
            data={"username": "valid@earth.org", "password": "WrongPassword123!"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("Incorrect email or password", response.json()["detail"])

    @patch('app.api.v1.endpoints.auth.db_helper')
    def test_get_me_success(self, mock_db_helper):
        from app.core.security import create_access_token
        mock_db = MagicMock()
        mock_db_helper.db = mock_db
        
        mock_user = {
            "_id": "60a4f5f5f5f5f5f5f5f5f500",
            "email": "user@earth.org",
            "role": "public_user",
            "isActive": True,
            "createdAt": "2026-06-20T23:44:03Z"
        }
        mock_db.users.find_one = AsyncMock(return_value=mock_user)
        
        # Generate token
        token = create_access_token(data={"sub": "user@earth.org", "role": "public_user"})
        headers = {"Authorization": f"Bearer {token}"}

        response = self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["email"], "user@earth.org")
        self.assertEqual(data["role"], "public_user")

    def test_get_me_no_token(self):
        response = self.client.get("/api/v1/auth/me")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

if __name__ == "__main__":
    unittest.main()
