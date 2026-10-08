import unittest
import uuid
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User
from app.models.disease_class import DiseaseClass
from app.models.diagnosis import Diagnosis


class AdminDiagnosisTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.admin = User(email="admin@test.com", full_name="Admin", password_hash="unused", role="admin")
        self.farmer = User(email="farmer@test.com", full_name="Leaf Farmer", password_hash="unused", role="farmer")
        self.other = User(email="other@test.com", full_name="Other", password_hash="unused", role="farmer")
        self.db.add_all([self.admin, self.farmer, self.other,
                         DiseaseClass(id=1, code="HEALTHY", name_th="Healthy", name_en="Healthy"),
                         DiseaseClass(id=2, code="BROWN_SPOT", name_th="Brown Spot", name_en="Brown Spot")])
        self.db.flush()
        self.completed = Diagnosis(user_id=self.farmer.id, image_url="/media/test.jpg", status="completed",
                                   predicted_class_id=1, confidence_score=0.9, class_probabilities={"HEALTHY": 0.9})
        self.failed = Diagnosis(user_id=self.other.id, image_url="/media/other.jpg", status="failed")
        self.processing = Diagnosis(user_id=self.farmer.id, image_url="/media/pending.jpg", status="processing")
        self.db.add_all([self.completed, self.failed, self.processing])
        self.db.commit()
        def override_db():
            yield self.db
        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)
        self.path = f"/api/v1/admin/diagnoses/{self.completed.id}"

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def headers(self, user):
        return {"Authorization": "Bearer " + create_access_token(user.id, user.role)}

    def test_permissions_and_owner_cannot_modify(self):
        for user in [None, self.farmer, self.other]:
            headers = self.headers(user) if user else {}
            expected = 403 if user else 401
            self.assertEqual(self.client.get("/api/v1/admin/diagnoses", headers=headers).status_code, expected)
            self.assertEqual(self.client.patch(self.path, headers=headers, json={"status": "failed"}).status_code, expected)
            self.assertEqual(self.client.delete(self.path, headers=headers).status_code, expected)
        self.assertIsNotNone(self.db.get(Diagnosis, self.completed.id))

    def test_search_combined_filters_and_pagination(self):
        for q in ["Leaf", "farmer@test.com", str(self.completed.id)]:
            response = self.client.get("/api/v1/admin/diagnoses", headers=self.headers(self.admin),
                                       params={"q": q, "status": "completed", "class_code": "healthy", "page_size": 1})
            self.assertEqual(response.status_code, 200)
            body = response.json()
            self.assertEqual(body["total"], 1)
            self.assertEqual(body["items"][0]["user_email"], self.farmer.email)
        wildcard = self.client.get("/api/v1/admin/diagnoses?q=%25", headers=self.headers(self.admin))
        self.assertEqual(wildcard.json()["total"], 0)
        paged = self.client.get("/api/v1/admin/diagnoses?page_size=1&page=2", headers=self.headers(self.admin)).json()
        self.assertEqual(paged["total"], 3)
        self.assertEqual(len(paged["items"]), 1)

    def test_edit_updates_owner_history_and_clears_stale_probabilities(self):
        edited = self.client.patch(self.path, headers=self.headers(self.admin), json={
            "status": "completed", "class_code": "BROWN_SPOT", "confidence_score": 0.8})
        self.assertEqual(edited.status_code, 200)
        self.assertEqual(edited.json()["result"]["class_code"], "BROWN_SPOT")
        self.assertIsNone(edited.json()["result"]["class_probabilities"])
        history = self.client.get(f"/api/v1/diagnoses/{self.completed.id}", headers=self.headers(self.farmer))
        self.assertEqual(history.json()["result"]["class_code"], "BROWN_SPOT")
        failed = self.client.patch(self.path, headers=self.headers(self.admin), json={"status": "failed"})
        self.assertEqual(failed.status_code, 200)
        self.assertIsNone(failed.json()["result"])
        self.db.expire_all()
        row = self.db.get(Diagnosis, self.completed.id)
        self.assertIsNone(row.predicted_class_id)
        self.assertIsNone(row.confidence_score)

    def test_invalid_updates_are_rejected_without_modification(self):
        for payload in [{"status": "completed"}, {"status": "completed", "class_code": "HEALTHY", "confidence_score": 1.1},
                        {"status": "processing"}, {"status": "failed", "user_id": str(self.other.id)},
                        {"status": "failed", "confidence_score": 0.5}]:
            self.assertEqual(self.client.patch(self.path, headers=self.headers(self.admin), json=payload).status_code, 422)
        self.assertEqual(self.client.patch(self.path, headers=self.headers(self.admin), json={
            "status": "completed", "class_code": "INVALID", "confidence_score": 0.8}).status_code, 400)
        self.db.expire_all()
        self.assertEqual(self.db.get(Diagnosis, self.completed.id).status, "completed")

    def test_delete_and_missing_records(self):
        self.assertEqual(self.client.delete(self.path, headers=self.headers(self.admin)).status_code, 204)
        self.assertEqual(self.client.delete(self.path, headers=self.headers(self.admin)).status_code, 404)
        self.assertEqual(self.client.get(f"/api/v1/diagnoses/{self.completed.id}", headers=self.headers(self.farmer)).status_code, 404)
        self.assertEqual(self.client.patch(f"/api/v1/admin/diagnoses/{uuid.uuid4()}", headers=self.headers(self.admin),
                                           json={"status": "failed"}).status_code, 404)

    def test_failure_reason_is_saved_and_returned_without_service_details(self):
        from app.services.ai_inference import InferenceError
        reasons = ["โมเดลยังแยกโรคในภาพนี้ได้ไม่ชัดเจน (ความเชื่อมั่น 54.0% ต่ำกว่าเกณฑ์ 55%)", "private service details"]
        for reason in reasons:
            with patch("app.api.v1.diagnoses.inference.run_inference", new=AsyncMock(side_effect=InferenceError(reason))), patch("app.api.v1.diagnoses.storage.save", return_value="/media/test.jpg"):
                response = self.client.post("/api/v1/diagnoses", headers=self.headers(self.farmer), files={"image": ("leaf.jpg", b"image", "image/jpeg")})
            self.assertEqual(response.status_code, 201)
            data = response.json()
            self.assertEqual(data["status"], "failed")
            expected = reason if reason.startswith("โมเดล") else "ระบบวิเคราะห์ภาพไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง"
            self.assertEqual(data["failure_reason"], expected)
            saved = self.client.get(f"/api/v1/diagnoses/{data['id']}", headers=self.headers(self.farmer)).json()
            self.assertEqual(saved["failure_reason"], expected)

    def test_processing_records_cannot_be_changed(self):
        path = f"/api/v1/admin/diagnoses/{self.processing.id}"
        self.assertEqual(self.client.patch(path, headers=self.headers(self.admin), json={"status": "failed"}).status_code, 409)
        self.assertEqual(self.client.delete(path, headers=self.headers(self.admin)).status_code, 409)


if __name__ == "__main__":
    unittest.main()
