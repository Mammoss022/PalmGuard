import uuid
from datetime import datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, SmallInteger, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class LeafAssessment(Base):
    __tablename__ = "leaf_assessments"
    __table_args__ = (CheckConstraint("severity_score BETWEEN 1 AND 5", name="ck_leaf_assessment_severity"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    diagnosis_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("diagnoses.id", ondelete="CASCADE"), unique=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expected_class_code: Mapped[str] = mapped_column(String(50), nullable=False)
    severity_score: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    symptoms: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    ai_class_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ai_model_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    diagnosis = relationship("Diagnosis", back_populates="assessment")

    @property
    def risk_level(self) -> str:
        return "low" if self.severity_score <= 2 else "medium" if self.severity_score == 3 else "high"
