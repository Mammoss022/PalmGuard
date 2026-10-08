import unittest
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import IntegrityError

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.core.security import create_access_token
from app.models.user import User
from app.models.diagnosis import Diagnosis
from app.models.satisfaction_survey import SatisfactionSurvey


class SurveyTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.admin = User(id=uuid.uuid4(), email="admin@test.com", full_name="Admin", password_hash="unused", role="admin")
        self.farmer = User(id=uuid.uuid4(), email="farmer@test.com", full_name="Farmer", password_hash="unused", role="farmer")
        self.other = User(id=uuid.uuid4(), email="other@test.com", full_name="Other", password_hash="unused", role="farmer")
        self.db.add_all([self.admin, self.farmer, self.other])
        self.db.flush()
        self.db.add(Diagnosis(user_id=self.farmer.id, image_url="/media/leaf.jpg", status="completed"))
        self.db.commit()
        def override_db():
            yield self.db
        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def headers(self, user):
        return {"Authorization": "Bearer " + create_access_token(user.id, user.role)}

    def submit(self, user, score=4, recommend=True):
        return self.client.post("/api/v1/surveys", headers=self.headers(user), json={
            "satisfaction_rating": score, "ease_of_use_rating": score, "accuracy_rating": score,
            "would_recommend": recommend, "comments": "Original feedback",
        })

    def test_prompt_status_persisted_and_duplicate_cannot_overwrite(self):
        before = self.client.get("/api/v1/surveys/me", headers=self.headers(self.farmer)).json()
        self.assertFalse(before["has_submitted"])
        self.assertTrue(before["eligible_for_prompt"])
        self.assertFalse(self.client.get("/api/v1/surveys/me", headers=self.headers(self.other)).json()["eligible_for_prompt"])
        first = self.submit(self.farmer)
        self.assertEqual(first.status_code, 201)
        self.assertTrue(first.json()["created_at"].endswith("Z"))
        after = self.client.get("/api/v1/surveys/me", headers=self.headers(self.farmer)).json()
        self.assertTrue(after["has_submitted"])
        self.assertFalse(after["eligible_for_prompt"])
        self.assertEqual(after["survey"]["id"], first.json()["id"])
        self.assertEqual(self.submit(self.farmer, score=1).status_code, 409)
        self.db.expire_all()
        self.assertEqual(self.db.scalar(select(func.count()).select_from(SatisfactionSurvey)), 1)
        self.assertEqual(self.db.scalar(select(SatisfactionSurvey.satisfaction_rating)), 4)

    def test_admin_read_only_and_user_identity_filter(self):
        self.submit(self.farmer)
        self.assertEqual(self.client.get("/api/v1/admin/surveys", headers=self.headers(self.farmer)).status_code, 403)
        self.assertEqual(self.client.get("/api/v1/admin/surveys/summary", headers=self.headers(self.farmer)).status_code, 403)
        response = self.client.get("/api/v1/admin/surveys", headers=self.headers(self.admin), params={"user_id": str(self.farmer.id)}).json()
        self.assertEqual(response["total"], 1)
        self.assertEqual(response["items"][0]["user_name"], "Farmer")
        self.assertEqual(response["items"][0]["comments"], "Original feedback")
        self.assertEqual(self.client.get("/api/v1/admin/surveys", headers=self.headers(self.admin), params={"user_id": str(self.other.id)}).json()["total"], 0)
        user = self.client.get(f"/api/v1/admin/users/{self.farmer.id}", headers=self.headers(self.admin)).json()
        self.assertTrue(user["has_submitted_survey"])
        for method in ["post", "put", "patch", "delete"]:
            self.assertEqual(getattr(self.client, method)("/api/v1/admin/surveys", headers=self.headers(self.admin)).status_code, 405)
        other = self.client.get("/api/v1/surveys/me", headers=self.headers(self.other)).json()
        self.assertIsNone(other["survey"])

    def test_summary_aggregates_entire_dataset_and_empty_state(self):
        empty = self.client.get("/api/v1/admin/surveys/summary", headers=self.headers(self.admin)).json()
        self.assertEqual(empty["total_responses"], 0)
        self.assertIsNone(empty["avg_accuracy_rating"])
        self.assertEqual(empty["accuracy_distribution"], [{"score": i, "count": 0} for i in range(1, 6)])
        self.submit(self.farmer, 1, False)
        self.submit(self.other, 5, True)
        summary = self.client.get("/api/v1/admin/surveys/summary", headers=self.headers(self.admin)).json()
        self.assertEqual(summary["total_responses"], 2)
        self.assertEqual(summary["responded_users"], 2)
        self.assertEqual(summary["total_users"], 3)
        self.assertEqual(summary["avg_accuracy_rating"], 3)
        self.assertEqual(summary["would_recommend_rate"], 0.5)
        self.assertEqual(summary["recommend_count"], 1)
        self.assertEqual(summary["not_recommend_count"], 1)
        self.assertEqual(summary["satisfaction_distribution"], [{"score": i, "count": int(i in [1, 5])} for i in range(1, 6)])
        paged = self.client.get("/api/v1/admin/surveys?page_size=1", headers=self.headers(self.admin)).json()
        self.assertEqual(len(paged["items"]), 1)
        self.assertEqual(paged["total"], 2)

    def test_database_index_prevents_concurrent_duplicates(self):
        self.submit(self.farmer)
        self.db.add(SatisfactionSurvey(user_id=self.farmer.id, satisfaction_rating=1, ease_of_use_rating=1,
                                       accuracy_rating=1, would_recommend=False))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()


if __name__ == "__main__":
    unittest.main()
