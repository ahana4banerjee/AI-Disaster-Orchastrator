import unittest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from bson import ObjectId
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.security import create_access_token
from app.main import app


class TestAdminCommsPhase71(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.mock_db = MagicMock()
        self.admin_token = create_access_token(data={"sub": "admin@earth.org", "role": "admin"})
        self.public_token = create_access_token(data={"sub": "citizen@earth.org", "role": "public_user"})
        app.dependency_overrides[get_db] = lambda: self.mock_db

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_comms_requires_admin_role(self):
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": ObjectId("60a4f5f5f5f5f5f5f5f5f599"),
            "email": "citizen@earth.org",
            "role": "public_user",
        })
        res = self.client.get("/api/v1/admin/activity-feed", headers={"Authorization": f"Bearer {self.public_token}"})
        self.assertEqual(res.status_code, 403)
        res_unauth = self.client.post("/api/v1/admin/communications", json={"message": "hello"})
        self.assertEqual(res_unauth.status_code, 401)

    def test_post_communication_and_activity_feed(self):
        admin_oid = ObjectId("60a4f5f5f5f5f5f5f5f5f500")
        comm_oid = ObjectId("60a4f5f5f5f5f5f5f5f5f577")
        self.mock_db.users.find_one = AsyncMock(return_value={
            "_id": admin_oid,
            "email": "admin@earth.org",
            "role": "admin",
        })

        insert_res = MagicMock()
        insert_res.inserted_id = comm_oid
        self.mock_db.admin_communications.insert_one = AsyncMock(return_value=insert_res)
        self.mock_db.admin_audit_logs.insert_one = AsyncMock(return_value=None)

        headers = {"Authorization": f"Bearer {self.admin_token}"}
        post_res = self.client.post(
            "/api/v1/admin/communications",
            json={
                "message": "<b>Shift Handover</b>: Mobilized 10 ambulances to Sector 3.",
                "category": "Handover",
                "relatedEntity": "SITREP-20261128-F504-V01",
            },
            headers=headers,
        )
        self.assertEqual(post_res.status_code, 201)
        body = post_res.json()
        self.assertEqual(body["message"], "Shift Handover: Mobilized 10 ambulances to Sector 3.")
        self.assertEqual(body["category"], "Handover")
        self.assertTrue(self.mock_db.admin_audit_logs.insert_one.called)

        # Mock cursors for activity-feed
        audit_cursor = MagicMock()
        audit_cursor.sort.return_value = audit_cursor
        audit_cursor.limit.return_value = audit_cursor
        audit_cursor.to_list = AsyncMock(return_value=[
            {
                "_id": ObjectId(),
                "adminUserId": admin_oid,
                "adminEmail": "admin@earth.org",
                "action": "GENERATE_REPORT",
                "targetCollection": "ai_reports",
                "details": "Compiled SitRep v1",
                "timestamp": datetime.now(timezone.utc),
            }
        ])
        self.mock_db.admin_audit_logs.find = MagicMock(return_value=audit_cursor)

        comm_cursor = MagicMock()
        comm_cursor.sort.return_value = comm_cursor
        comm_cursor.limit.return_value = comm_cursor
        comm_cursor.to_list = AsyncMock(return_value=[
            {
                "_id": comm_oid,
                "adminUserId": admin_oid,
                "adminEmail": "admin@earth.org",
                "message": "Shift Handover: Mobilized 10 ambulances to Sector 3.",
                "category": "Handover",
                "relatedEntity": "SITREP-20261128-F504-V01",
                "createdAt": datetime.now(timezone.utc),
            }
        ])
        self.mock_db.admin_communications.find = MagicMock(return_value=comm_cursor)

        feed_res = self.client.get("/api/v1/admin/activity-feed", headers=headers)
        self.assertEqual(feed_res.status_code, 200)
        feed = feed_res.json()
        self.assertEqual(len(feed["auditLogs"]), 1)
        self.assertEqual(len(feed["communications"]), 1)
        self.assertEqual(feed["auditLogs"][0]["action"], "GENERATE_REPORT")
