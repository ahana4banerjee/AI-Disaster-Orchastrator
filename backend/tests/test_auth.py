import os
import sys
import unittest
from unittest.mock import MagicMock, AsyncMock
from fastapi import status
from fastapi.testclient import TestClient

# Insert backend directory in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash

class TestAuthAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.mock_db = MagicMock()
        app.dependency_overrides[get_db] = lambda: self.mock_db

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_register_user_success(self):
        # Mock database lookup finding no existing user
        self.mock_db.users.find_one = AsyncMock(return_value=None)
        
        # Mock insert_one returning an object with inserted_id
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = "60a4f5f5f5f5f5f5f5f5f500"
        self.mock_db.users.insert_one = AsyncMock(return_value=mock_insert_result)

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

    def test_register_user_duplicate_email(self):
        # Mock database lookup finding an existing user
        self.mock_db.users.find_one = AsyncMock(return_value={"email": "duplicate@earth.org"})

        payload = {
            "email": "duplicate@earth.org",
            "password": "SecurePassword123!",
            "role": "public_user"
        }
        
        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already exists", response.json()["detail"])

    def test_login_success(self):
        # Mock database lookup finding the user
        hashed_password = get_password_hash("CorrectPassword123!")
        mock_user = {
            "email": "valid@earth.org",
            "password": hashed_password,
            "role": "admin",
            "isActive": True
        }
        self.mock_db.users.find_one = AsyncMock(return_value=mock_user)

        response = self.client.post(
            "/api/v1/auth/login",
            data={"username": "valid@earth.org", "password": "CorrectPassword123!"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["role"], "admin")
        self.assertEqual(data["token_type"], "bearer")
        self.assertIn("refresh_token", response.cookies)

    def test_login_incorrect_password(self):
        hashed_password = get_password_hash("CorrectPassword123!")
        mock_user = {
            "email": "valid@earth.org",
            "password": hashed_password,
            "role": "admin"
        }
        self.mock_db.users.find_one = AsyncMock(return_value=mock_user)

        response = self.client.post(
            "/api/v1/auth/login",
            data={"username": "valid@earth.org", "password": "WrongPassword123!"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("Incorrect email or password", response.json()["detail"])

    def test_get_me_success(self):
        mock_user = {
            "_id": "60a4f5f5f5f5f5f5f5f5f500",
            "email": "user@earth.org",
            "role": "public_user",
            "isActive": True,
            "createdAt": "2026-06-20T23:44:03Z"
        }
        self.mock_db.users.find_one = AsyncMock(return_value=mock_user)
        
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

    def test_refresh_token_success(self):
        # Generate a valid refresh token
        refresh_token = create_access_token(data={"sub": "user@earth.org", "role": "public_user"})
        
        # Mock database lookup for user verification
        mock_user = {
            "_id": "60a4f5f5f5f5f5f5f5f5f500",
            "email": "user@earth.org",
            "role": "public_user",
            "isActive": True
        }
        self.mock_db.users.find_one = AsyncMock(return_value=mock_user)
        
        # Call refresh token endpoint with HTTPOnly cookie
        response = self.client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": refresh_token}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")

    def test_refresh_token_missing_cookie(self):
        response = self.client.post("/api/v1/auth/refresh")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("Refresh token missing", response.json()["detail"])

    def test_refresh_token_invalid_token(self):
        response = self.client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": "invalid_token_value_here"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_user_not_found(self):
        refresh_token = create_access_token(data={"sub": "nonexistent@earth.org", "role": "public_user"})
        self.mock_db.users.find_one = AsyncMock(return_value=None)
        
        response = self.client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": refresh_token}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("User not found", response.json()["detail"])

if __name__ == "__main__":
    unittest.main()
