from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.disease_class import DiseaseClass


def list_all(db: Session) -> list[DiseaseClass]:
    stmt = select(DiseaseClass).order_by(DiseaseClass.id)
    return list(db.execute(stmt).scalars().all())


def get_by_code(db: Session, code: str) -> DiseaseClass | None:
    stmt = select(DiseaseClass).where(DiseaseClass.code == code.upper())
    return db.execute(stmt).scalar_one_or_none()


def get_by_id(db: Session, disease_class_id: int) -> DiseaseClass | None:
    return db.get(DiseaseClass, disease_class_id)
