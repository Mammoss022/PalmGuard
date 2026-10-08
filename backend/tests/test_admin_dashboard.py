import unittest
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User
from app.models.diagnosis import Diagnosis
from app.models.disease_class import DiseaseClass
from app.models.leaf_assessment import LeafAssessment
from app.models.satisfaction_survey import SatisfactionSurvey
from app.services.admin_dashboard import get_dashboard, model_overview, read_evaluation
from app.core.config import settings


class AdminDashboardTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.now = datetime.now(timezone.utc)
        self.admin = User(email="admin@test.com", full_name="Admin", role="admin", password_hash="unused", created_at=self.now - timedelta(days=40))
        self.farmer = User(email="farmer@test.com", full_name="Farmer", role="farmer", password_hash="unused", created_at=self.now)
        self.other = User(email="other@test.com", full_name="Other", role="farmer", password_hash="unused", created_at=self.now - timedelta(days=40))
        self.db.add_all([self.admin, self.farmer, self.other,
            DiseaseClass(id=1, code="HEALTHY", name_th="Healthy", name_en="Healthy"),
            DiseaseClass(id=2, code="BROWN_SPOT", name_th="Brown", name_en="Brown")])
        self.db.flush()
        self.good = Diagnosis(user_id=self.farmer.id, image_url="/media/good.jpg", status="completed", predicted_class_id=1, confidence_score=.9, model_version="mobilenetv2:v1.3", created_at=self.now)
        self.low = Diagnosis(user_id=self.farmer.id, image_url="/media/low.jpg", status="completed", predicted_class_id=2, confidence_score=.5, model_version="mobilenetv2:v1.3", created_at=self.now)
        self.corrected = Diagnosis(user_id=self.farmer.id, image_url="/media/edit.jpg", status="completed", predicted_class_id=1, confidence_score=.1, model_version="admin-corrected", created_at=self.now)
        self.failed = Diagnosis(user_id=self.other.id, image_url="/media/fail.jpg", status="failed", created_at=self.now - timedelta(days=40))
        self.db.add_all([self.good, self.low, self.corrected, self.failed])
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

    def add_assessments(self):
        self.db.add_all([
            LeafAssessment(user_id=self.farmer.id, diagnosis_id=self.good.id, expected_class_code="HEALTHY", severity_score=1, symptoms=[], ai_class_code="HEALTHY", ai_model_version="v1.3", created_at=self.now),
            LeafAssessment(user_id=self.farmer.id, diagnosis_id=self.low.id, expected_class_code="HEALTHY", severity_score=1, symptoms=[], ai_class_code="BROWN_SPOT", ai_model_version="v1.3", created_at=self.now),
            LeafAssessment(user_id=self.other.id, diagnosis_id=self.failed.id, expected_class_code="BROWN_SPOT", severity_score=4, symptoms=["brown_spots", "drying"], ai_class_code=None, created_at=self.now),
            SatisfactionSurvey(user_id=self.farmer.id, satisfaction_rating=5, ease_of_use_rating=4, accuracy_rating=3, would_recommend=True, created_at=self.now)])
        self.db.commit()

    def test_aggregate_window_active_users_and_comparison(self):
        self.add_assessments()
        result = get_dashboard(self.db, 30, self.now + timedelta(seconds=1))
        self.assertEqual(result.users.total, 3)
        self.assertEqual(result.users.new_users, 1)
        self.assertEqual(result.users.active_users, 2)
        self.assertEqual(result.ai.total, 3)
        self.assertEqual(result.ai.completed, 3)
        self.assertEqual(result.ai.failed, 0)
        self.assertAlmostEqual(result.ai.mean_confidence, .7)
        self.assertEqual(result.ai.low_confidence, 1)
        self.assertEqual(result.ai.admin_corrected, 1)
        self.assertEqual(sum(row.count for row in result.ai.daily), 3)
        self.assertEqual(result.assessments.total, 3)
        self.assertEqual(result.assessments.satisfaction_count, 1)
        self.assertEqual(result.assessments.mean_satisfaction, 5)
        self.assertEqual(result.comparison.eligible, 2)
        self.assertEqual(result.comparison.agreed, 1)
        self.assertEqual(result.comparison.disagreed, 1)
        self.assertEqual(result.comparison.excluded, 1)
        self.assertEqual(result.comparison.agreement_rate, .5)
        self.assertEqual({r.code: r.count for r in result.assessments.risks}, {"low": 2, "medium": 0, "high": 1})
        self.assertEqual(sum(r.count for r in result.assessments.symptoms), 2)

    def test_admin_only_dashboard_and_date_validation(self):
        self.assertEqual(self.client.get("/api/v1/admin/dashboard").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/admin/dashboard", headers=self.headers(self.farmer)).status_code, 403)
        response = self.client.get("/api/v1/admin/dashboard?days=7", headers=self.headers(self.admin))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["days"], 7)
        self.assertEqual(response.json()["users"]["total"], 3)
        self.assertTrue(response.json()["end_at"].endswith("Z"))
        for days in [0, 366]:
            self.assertEqual(self.client.get(f"/api/v1/admin/dashboard?days={days}", headers=self.headers(self.admin)).status_code, 422)

    def test_empty_dataset_uses_null_instead_of_fabricated_rates(self):
        empty_engine = create_engine("sqlite://")
        Base.metadata.create_all(empty_engine)
        with Session(empty_engine) as db:
            result = get_dashboard(db, 7)
            self.assertEqual(result.users.total, 0)
            self.assertEqual(result.ai.total, 0)
            self.assertIsNone(result.ai.mean_confidence)
            self.assertIsNone(result.assessments.mean_severity)
            self.assertIsNone(result.comparison.agreement_rate)
        empty_engine.dispose()

    def test_bangkok_midnight_boundary_and_future_records(self):
        fixed = datetime(2026, 10, 8, 2, tzinfo=timezone.utc)
        self.good.created_at = datetime(2026, 10, 7, 17, 1, tzinfo=timezone.utc)
        self.low.created_at = datetime(2026, 10, 7, 16, 59, tzinfo=timezone.utc)
        self.corrected.created_at = fixed + timedelta(days=1)
        self.db.commit()
        result = get_dashboard(self.db, 1, fixed)
        self.assertEqual(result.ai.total, 1)
        self.assertEqual(result.ai.daily[0].code, "2026-10-08")
        self.assertEqual(result.ai.daily[0].count, 1)

    def test_assessment_ownership_validation_immutable_and_snapshot(self):
        endpoint = f"/api/v1/diagnoses/{self.good.id}/assessment"
        payload = {"expected_class_code": "HEALTHY", "severity_score": 1, "symptoms": []}
        for user in [self.other, self.admin]:
            self.assertEqual(self.client.post(endpoint, headers=self.headers(user), json=payload).status_code, 403)
        self.assertEqual(self.client.get(endpoint, headers=self.headers(self.other)).status_code, 403)
        self.assertEqual(self.client.post(endpoint, headers=self.headers(self.farmer), json={**payload, "severity_score": 5}).status_code, 422)
        self.assertEqual(self.client.post(endpoint, headers=self.headers(self.farmer), json={**payload, "symptoms": ["INVALID"]}).status_code, 422)
        response = self.client.post(endpoint, headers=self.headers(self.farmer), json=payload)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["risk_level"], "low")
        self.assertEqual(self.client.post(endpoint, headers=self.headers(self.farmer), json=payload).status_code, 409)
        self.client.patch(f"/api/v1/admin/diagnoses/{self.good.id}", headers=self.headers(self.admin),
            json={"status": "completed", "class_code": "BROWN_SPOT", "confidence_score": .8})
        row = self.db.scalar(select(LeafAssessment).where(LeafAssessment.diagnosis_id == self.good.id))
        self.assertEqual(row.ai_class_code, "HEALTHY")
        self.assertEqual(self.client.get(endpoint, headers=self.headers(self.admin)).status_code, 200)
        self.assertEqual(self.client.delete(f"/api/v1/admin/diagnoses/{self.good.id}", headers=self.headers(self.admin)).status_code, 204)
        self.assertIsNone(self.db.scalar(select(LeafAssessment).where(LeafAssessment.diagnosis_id == self.good.id)))

    def test_failed_and_corrected_results_are_not_ai_comparison_pairs(self):
        payload = {"expected_class_code": "BROWN_SPOT", "severity_score": 3, "symptoms": ["brown_spots", "brown_spots"]}
        response = self.client.post(f"/api/v1/diagnoses/{self.failed.id}/assessment", headers=self.headers(self.other), json=payload)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["symptoms"], ["brown_spots"])
        response = self.client.post(f"/api/v1/diagnoses/{self.corrected.id}/assessment", headers=self.headers(self.farmer), json=payload)
        self.assertEqual(response.status_code, 201)
        result = get_dashboard(self.db, 7)
        self.assertEqual(result.comparison.eligible, 0)
        self.assertEqual(result.comparison.excluded, 2)

    def test_evaluation_formats_and_missing_reports(self):
        models = Path(__file__).resolve().parents[2] / "ai" / "models"
        latest = read_evaluation(models / "evaluation-v1.3.json", "v1.3")
        self.assertTrue(latest.available)
        self.assertEqual([d.support for d in latest.datasets], [365, 397])
        self.assertAlmostEqual(latest.datasets[0].accuracy, .9643835616438357)
        old = read_evaluation(models / "evaluation-v1.2.json", "v1.2")
        self.assertTrue(old.available)
        self.assertEqual(old.datasets[0].support, 417)
        self.assertFalse(read_evaluation(models / "missing.json", "v9").available)
        with patch.object(settings, "AI_BACKEND", "gemini"):
            self.assertFalse(model_overview().available)

    def test_processing_and_missing_diagnoses_cannot_be_assessed(self):
        self.good.status = "processing"
        self.db.commit()
        payload = {"expected_class_code": "HEALTHY", "severity_score": 1, "symptoms": []}
        self.assertEqual(self.client.post(f"/api/v1/diagnoses/{self.good.id}/assessment",
            headers=self.headers(self.farmer), json=payload).status_code, 409)
        self.assertEqual(self.client.post(f"/api/v1/diagnoses/{uuid.uuid4()}/assessment",
            headers=self.headers(self.farmer), json=payload).status_code, 404)


if __name__ == "__main__":
    unittest.main()
