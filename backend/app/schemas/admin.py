import uuid
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.diagnosis import DiagnosisResponse
from app.schemas.user import UserResponse


class UserListResponse(BaseModel):
    items: list[UserResponse]
    page: int
    page_size: int
    total: int


class AdminDiagnosisResponse(DiagnosisResponse):
    user_id: uuid.UUID
    user_name: str
    user_email: str

    @classmethod
    def from_model(cls, diagnosis):
        return cls(**DiagnosisResponse.from_model(diagnosis).model_dump(),
                   user_id=diagnosis.user_id, user_name=diagnosis.user.full_name,
                   user_email=diagnosis.user.email)


class AdminDiagnosisUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["completed", "failed"]
    class_code: str | None = None
    confidence_score: float | None = Field(default=None, ge=0, le=1)

    @model_validator(mode="after")
    def check_result(self):
        if self.status == "completed" and (not self.class_code or self.confidence_score is None):
            raise ValueError("Completed results require a disease class and confidence score")
        if self.status == "failed" and (self.class_code is not None or self.confidence_score is not None):
            raise ValueError("Failed results cannot contain a disease class or confidence score")
        return self


class AdminDiagnosisListResponse(BaseModel):
    items: list[AdminDiagnosisResponse]
    page: int
    page_size: int
    total: int
