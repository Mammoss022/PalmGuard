import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from app.models.satisfaction_survey import SatisfactionSurvey
from app.models.user import User
from app.core.exceptions import ConflictError
from app.db.demo_data import real_users, real_user_ids


def get_by_user(db: Session, user_id: uuid.UUID) -> SatisfactionSurvey | None:
    return db.scalars(select(SatisfactionSurvey).where(SatisfactionSurvey.user_id == user_id)
                      .order_by(SatisfactionSurvey.created_at.desc()).limit(1)).first()


def submitted_user_ids(db: Session, user_ids: list[uuid.UUID]) -> set[uuid.UUID]:
    if not user_ids:
        return set()
    return set(db.scalars(select(SatisfactionSurvey.user_id).where(SatisfactionSurvey.user_id.in_(user_ids))))


def create(
    db: Session,
    *,
    user_id: uuid.UUID,
    satisfaction_rating: int,
    ease_of_use_rating: int,
    accuracy_rating: int,
    would_recommend: bool,
    comments: str | None,
) -> SatisfactionSurvey:
    if get_by_user(db, user_id) is not None:
        raise ConflictError("คุณส่งแบบประเมินแล้ว ไม่สามารถส่งซ้ำหรือแก้ไขคำตอบได้")
    survey = SatisfactionSurvey(
        user_id=user_id,
        satisfaction_rating=satisfaction_rating,
        ease_of_use_rating=ease_of_use_rating,
        accuracy_rating=accuracy_rating,
        would_recommend=would_recommend,
        comments=comments,
    )
    db.add(survey)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if get_by_user(db, user_id) is not None:
            raise ConflictError("คุณส่งแบบประเมินแล้ว ไม่สามารถส่งซ้ำหรือแก้ไขคำตอบได้") from None
        raise
    db.refresh(survey)
    return survey


def list_all(db: Session, *, page: int, page_size: int, user_id: uuid.UUID | None = None) -> tuple[list[SatisfactionSurvey], int]:
    base = select(SatisfactionSurvey)
    if user_id is not None:
        base = base.where(SatisfactionSurvey.user_id == user_id)
    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    stmt = (
        base.options(joinedload(SatisfactionSurvey.user)).order_by(SatisfactionSurvey.created_at.desc(), SatisfactionSurvey.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.execute(stmt).scalars().all())
    return items, total


def get_summary(db: Session) -> dict:
    extra = {
        "total_users": db.scalar(select(func.count()).select_from(User).where(real_users())),
        "responded_users": db.scalar(select(func.count(func.distinct(SatisfactionSurvey.user_id))).where(SatisfactionSurvey.user_id.in_(real_user_ids()))),
    }
    for name, column in [("satisfaction", SatisfactionSurvey.satisfaction_rating),
                         ("ease_of_use", SatisfactionSurvey.ease_of_use_rating),
                         ("accuracy", SatisfactionSurvey.accuracy_rating)]:
        counts = dict(db.execute(select(column, func.count()).where(SatisfactionSurvey.user_id.in_(real_user_ids())).group_by(column)).all())
        extra[f"{name}_distribution"] = [{"score": score, "count": counts.get(score, 0)} for score in range(1, 6)]
    total = db.execute(select(func.count()).select_from(SatisfactionSurvey).where(SatisfactionSurvey.user_id.in_(real_user_ids()))).scalar_one()
    if total == 0:
        return {
            **extra,
            "total_responses": 0,
            "avg_satisfaction_rating": None,
            "avg_ease_of_use_rating": None,
            "avg_accuracy_rating": None,
            "would_recommend_rate": None,
        }

    avg_satisfaction, avg_ease, avg_accuracy = db.execute(
        select(
            func.avg(SatisfactionSurvey.satisfaction_rating),
            func.avg(SatisfactionSurvey.ease_of_use_rating),
            func.avg(SatisfactionSurvey.accuracy_rating),
        )
    .where(SatisfactionSurvey.user_id.in_(real_user_ids()))).one()

    recommend_count = db.execute(
        select(func.count()).select_from(SatisfactionSurvey).where(SatisfactionSurvey.would_recommend.is_(True), SatisfactionSurvey.user_id.in_(real_user_ids()))
    ).scalar_one()

    return {
        **extra,
        "total_responses": total,
        "avg_satisfaction_rating": float(avg_satisfaction) if avg_satisfaction is not None else None,
        "avg_ease_of_use_rating": float(avg_ease) if avg_ease is not None else None,
        "avg_accuracy_rating": float(avg_accuracy) if avg_accuracy is not None else None,
        "would_recommend_rate": recommend_count / total,
        "recommend_count": recommend_count,
        "not_recommend_count": total - recommend_count,
    }
