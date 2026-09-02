from fastapi import APIRouter, Query

from app.api.deps import AdminUser, DbSession, Pagination
from app.core.exceptions import NotFoundError
from app.crud import diagnosis as diagnosis_crud
from app.crud import survey as survey_crud
from app.crud import user as user_crud
from app.schemas.admin import AdminDiagnosisListResponse, UserListResponse
from app.schemas.diagnosis import DiagnosisResponse
from app.schemas.survey import SurveyListResponse, SurveyResponse, SurveySummaryResponse
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("/users", response_model=UserListResponse)
def list_users(admin: AdminUser, db: DbSession, pagination: Pagination) -> UserListResponse:
    items, total = user_crud.list_users(db, page=pagination.page, page_size=pagination.page_size)
    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in items],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
    )


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: str, admin: AdminUser, db: DbSession) -> UserResponse:
    user = user_crud.get_by_id(db, user_id)
    if user is None:
        raise NotFoundError("ไม่พบผู้ใช้งานนี้")
    return UserResponse.model_validate(user)


@router.get("/diagnoses", response_model=AdminDiagnosisListResponse)
def list_all_diagnoses(
    admin: AdminUser,
    db: DbSession,
    pagination: Pagination,
    class_code: str | None = Query(default=None),
    status: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
) -> AdminDiagnosisListResponse:
    items, total = diagnosis_crud.list_all(
        db,
        page=pagination.page,
        page_size=pagination.page_size,
        class_code=class_code,
        status=status,
        user_id=user_id,
    )
    return AdminDiagnosisListResponse(
        items=[DiagnosisResponse.from_model(d) for d in items],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
    )


@router.get("/surveys", response_model=SurveyListResponse)
def list_surveys(admin: AdminUser, db: DbSession, pagination: Pagination) -> SurveyListResponse:
    items, total = survey_crud.list_all(db, page=pagination.page, page_size=pagination.page_size)
    return SurveyListResponse(
        items=[SurveyResponse.from_model(s) for s in items],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
    )


@router.get("/surveys/summary", response_model=SurveySummaryResponse)
def get_survey_summary(admin: AdminUser, db: DbSession) -> SurveySummaryResponse:
    return SurveySummaryResponse(**survey_crud.get_summary(db))
