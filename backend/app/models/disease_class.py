from typing import TYPE_CHECKING

from sqlalchemy import SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.diagnosis import Diagnosis


class DiseaseClass(Base):
    __tablename__ = "disease_classes"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name_th: Mapped[str] = mapped_column(String(100), nullable=False)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation_th: Mapped[str | None] = mapped_column(Text, nullable=True)

    diagnoses: Mapped[list["Diagnosis"]] = relationship(back_populates="disease_class")
