import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Numeric, SmallInteger, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.disease_class import DiseaseClass
    from app.models.user import User

# Mirrors docs/DATABASE.md#diagnoses status values exactly.
STATUS_PROCESSING = "processing"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    predicted_class_id: Mapped[int | None] = mapped_column(
        SmallInteger, ForeignKey("disease_classes.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    confidence_score: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    # Per-class probability breakdown (disease_classes.code -> 0.0-1.0), for the
    # "probability per class" result display (docs/API.md) — None for
    # diagnoses predating this column, or when the AI backend couldn't
    # produce one (see app/services/ai_inference.py::InferenceResult).
    class_probabilities: Mapped[dict[str, float] | None] = mapped_column(JSON, nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=STATUS_PROCESSING)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    user: Mapped["User"] = relationship(back_populates="diagnoses")
    disease_class: Mapped["DiseaseClass | None"] = relationship(back_populates="diagnoses")
