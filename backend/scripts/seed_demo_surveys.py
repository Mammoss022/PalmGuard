"""Create ten explicitly synthetic surveys in the configured DB, idempotently."""
import sys
import secrets
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.db.base
from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.db.demo_data import DEMO_DOMAIN
from app.core.security import hash_password
from app.models.user import User
from app.models.satisfaction_survey import SatisfactionSurvey
from app.crud.survey import get_summary


def main():
    scores = [(4,5,3), (5,4,4), (3,4,3), (4,4,4), (5,5,4),
              (3,3,2), (4,5,3), (4,4,4), (5,4,5), (3,4,3)]
    with SessionLocal() as db:
        before = get_summary(db)
        added = 0
        for index, (satisfaction, ease, accuracy) in enumerate(scores, 1):
            email = f"survey-test-{index:02d}{DEMO_DOMAIN}"
            user = db.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(email=email, full_name=f"[ข้อมูลจำลอง] ผู้ทดสอบ {index:02d}",
                            password_hash=hash_password(secrets.token_urlsafe(32)), role="farmer")
                db.add(user)
                db.flush()
            if db.scalar(select(SatisfactionSurvey.id).where(SatisfactionSurvey.user_id == user.id)) is None:
                db.add(SatisfactionSurvey(user_id=user.id, satisfaction_rating=satisfaction,
                    ease_of_use_rating=ease, accuracy_rating=accuracy, would_recommend=satisfaction >= 4,
                    comments="[ข้อมูลจำลองสำหรับทดสอบระบบ] สร้างโดยสคริปต์ ไม่ใช่คำตอบของผู้ใช้จริง และไม่ใช้เป็นผลวิจัยความพึงพอใจ"))
                added += 1
        db.flush()
        after = get_summary(db)
        assert before == after, "Demo fixtures must not change real survey statistics"
        db.commit()
        total = db.scalar(select(func.count()).select_from(SatisfactionSurvey).join(User).where(User.email.endswith(DEMO_DOMAIN)))
        print(f"Added {added} synthetic surveys; total synthetic surveys: {total}. Real survey statistics unchanged.")


if __name__ == "__main__":
    main()
