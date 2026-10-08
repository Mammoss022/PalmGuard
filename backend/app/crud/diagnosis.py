import uuid

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.diagnosis import STATUS_COMPLETED, STATUS_FAILED, Diagnosis
from app.models.disease_class import DiseaseClass
from app.models.user import User


def create(db: Session, *, user_id: uuid.UUID, image_url: str, thumbnail_url: str | None = None) -> Diagnosis:
    diagnosis = Diagnosis(
        user_id=user_id,
        image_url=image_url,
        thumbnail_url=thumbnail_url,
        status="processing",
    )
    db.add(diagnosis)
    db.commit()
    db.refresh(diagnosis)
    return diagnosis


def mark_completed(
    db: Session,
    diagnosis: Diagnosis,
    *,
    class_id: int,
    confidence_score: float,
    model_version: str,
    class_probabilities: dict[str, float] | None = None,
) -> Diagnosis:
    diagnosis.predicted_class_id = class_id
    diagnosis.confidence_score = confidence_score
    diagnosis.model_version = model_version
    diagnosis.class_probabilities = class_probabilities
    diagnosis.status = STATUS_COMPLETED
    diagnosis.failure_reason = None
    db.commit()
    db.refresh(diagnosis)
    return diagnosis


def mark_failed(db: Session, diagnosis: Diagnosis, *, reason: str | None = None) -> Diagnosis:
    diagnosis.status = STATUS_FAILED
    diagnosis.failure_reason = reason
    db.commit()
    db.refresh(diagnosis)
    return diagnosis


def get_by_id(db: Session, diagnosis_id: uuid.UUID | str) -> Diagnosis | None:
    if isinstance(diagnosis_id, str):
        try:
            diagnosis_id = uuid.UUID(diagnosis_id)
        except ValueError:
            return None
    stmt = (
        select(Diagnosis)
        .options(joinedload(Diagnosis.disease_class))
        .where(Diagnosis.id == diagnosis_id)
    )
    return db.execute(stmt).scalar_one_or_none()


def list_by_user(db: Session, *, user_id: uuid.UUID, page: int, page_size: int) -> tuple[list[Diagnosis], int]:
    base = select(Diagnosis).where(Diagnosis.user_id == user_id)
    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    stmt = (
        base.options(joinedload(Diagnosis.disease_class))
        .order_by(Diagnosis.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.execute(stmt).unique().scalars().all())
    return items, total


def list_all(
    db: Session,
    *,
    page: int,
    page_size: int,
    class_code: str | None = None,
    status: str | None = None,
    user_id: uuid.UUID | str | None = None,
    q: str | None = None,
) -> tuple[list[Diagnosis], int]:
    base = select(Diagnosis)
    if q and q.strip():
        term = q.strip()
        matches = [
            User.full_name.icontains(term, autoescape=True),
            User.email.icontains(term, autoescape=True),
        ]
        identifier = term.replace("-", "")
        if identifier:
            matches.append(func.replace(cast(Diagnosis.id, String), "-", "").icontains(identifier, autoescape=True))
        base = base.join(Diagnosis.user).where(or_(*matches))
    if class_code is not None:
        base = base.join(Diagnosis.disease_class).where(DiseaseClass.code == class_code.upper())
    if status is not None:
        base = base.where(Diagnosis.status == status)
    if user_id is not None:
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                return [], 0
        base = base.where(Diagnosis.user_id == user_id)

    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    stmt = (
        base.options(joinedload(Diagnosis.disease_class), joinedload(Diagnosis.user))
        .order_by(Diagnosis.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.execute(stmt).unique().scalars().all())
    return items, total
