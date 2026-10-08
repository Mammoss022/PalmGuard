import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.auth import PHONE_PATTERN
from app.schemas.datetime import UtcDateTime


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    phone_number: str | None
    role: str
    created_at: UtcDateTime
    has_submitted_survey: bool = False


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone_number: str | None = Field(default=None, max_length=20)

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str | None) -> str | None:
        if value is not None and not PHONE_PATTERN.match(value):
            raise ValueError("รูปแบบเบอร์โทรไม่ถูกต้อง")
        return value
