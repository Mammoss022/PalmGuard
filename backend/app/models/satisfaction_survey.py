import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, SmallInteger, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.user import User


class SatisfactionSurvey(Base):
    """UAT satisfaction survey submitted by a farmer after trying the system.

    Matches docs/PROJECT.md's Methodology step 4 (User Acceptance Testing) —
    one submission per user visit to the survey form, not tied to a specific
    Diagnosis, since it asks about the system overall.
    """

    __tablename__ = "satisfaction_surveys"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    satisfaction_rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    ease_of_use_rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    accuracy_rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    would_recommend: Mapped[bool] = mapped_column(Boolean, nullable=False)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    user: Mapped["User"] = relationship()
