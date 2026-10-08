"""Regression: UTC stored without an offset must not be interpreted as local time."""

import unittest
import uuid
from datetime import datetime, timedelta, timezone

from app.schemas.diagnosis import DiagnosisResponse
from app.schemas.survey import SurveyResponse
from app.schemas.user import UserResponse


class TimestampSerializationTests(unittest.TestCase):
    def responses(self, timestamp):
        common = {"id": uuid.uuid4(), "created_at": timestamp}
        return [
            DiagnosisResponse(**common, image_url="/media/leaf.jpg", status="processing"),
            UserResponse(**common, email="test@example.com", full_name="Test", phone_number=None, role="farmer"),
            SurveyResponse(**common, satisfaction_rating=5, ease_of_use_rating=5,
                           accuracy_rating=5, would_recommend=True, comments=None),
        ]

    def test_sqlite_naive_utc_is_explicit_in_all_responses(self):
        for response in self.responses(datetime(2026, 10, 5, 20, 18, 5)):
            with self.subTest(schema=type(response).__name__):
                self.assertEqual(response.model_dump(mode="json")["created_at"], "2026-10-05T20:18:05Z")
                bangkok = response.created_at.astimezone(timezone(timedelta(hours=7)))
                self.assertEqual(bangkok.isoformat(), "2026-10-06T03:18:05+07:00")

    def test_aware_timestamp_preserves_instant_without_double_shift(self):
        local = datetime(2026, 10, 6, 3, 18, 5, tzinfo=timezone(timedelta(hours=7)))
        for response in self.responses(local):
            with self.subTest(schema=type(response).__name__):
                self.assertEqual(response.model_dump(mode="json")["created_at"], "2026-10-05T20:18:05Z")

    def test_explicit_utc_is_unchanged(self):
        for response in self.responses("2026-10-05T20:18:05Z"):
            self.assertEqual(response.model_dump(mode="json")["created_at"], "2026-10-05T20:18:05Z")


if __name__ == "__main__":
    unittest.main()
