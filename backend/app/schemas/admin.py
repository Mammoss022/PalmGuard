from pydantic import BaseModel

from app.schemas.diagnosis import DiagnosisResponse
from app.schemas.user import UserResponse


class UserListResponse(BaseModel):
    items: list[UserResponse]
    page: int
    page_size: int
    total: int


class AdminDiagnosisListResponse(BaseModel):
    items: list[DiagnosisResponse]
    page: int
    page_size: int
    total: int
