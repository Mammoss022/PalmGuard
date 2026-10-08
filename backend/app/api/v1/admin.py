from fastapi import APIRouter, Query, Response
from typing import Literal

from app.api.deps import AdminUser, DbSession, Pagination
from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.crud import diagnosis as diagnosis_crud
from app.crud import survey as survey_crud
from app.crud import user as user_crud
from app.schemas.admin import AdminDiagnosisListResponse, AdminDiagnosisResponse, AdminDiagnosisUpdate, UserListResponse
from app.crud import disease as disease_crud
from app.schemas.survey import SurveyResponse, SurveySummaryResponse
from app.schemas.survey import AdminSurveyListResponse, AdminSurveyResponse
import uuid
from app.schemas.user import UserResponse
from app.schemas.admin_dashboard import AdminDashboardResponse

router = APIRouter()


@router.get("/dashboard", response_model=AdminDashboardResponse)
def dashboard(admin: AdminUser, db: DbSession, days: int = Query(default=30, ge=1, le=365)):
    from app.services.admin_dashboard import get_dashboard
    return get_dashboard(db, days)


@router.get("/users", response_model=UserListResponse)
def list_users(admin: AdminUser, db: DbSession, pagination: Pagination) -> UserListResponse:
    items, total = user_crud.list_users(db, page=pagination.page, page_size=pagination.page_size)
    submitted = survey_crud.submitted_user_ids(db, [u.id for u in items])
    return UserListResponse(
        items=[UserResponse.model_validate(u).model_copy(update={"has_submitted_survey": u.id in submitted}) for u in items],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
    )


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: str, admin: AdminUser, db: DbSession) -> UserResponse:
    user = user_crud.get_by_id(db, user_id)
    if user is None:
        raise NotFoundError("ไม่พบผู้ใช้งานนี้")
    return UserResponse.model_validate(user).model_copy(update={
        "has_submitted_survey": survey_crud.get_by_user(db, user.id) is not None})


@router.get("/diagnoses", response_model=AdminDiagnosisListResponse)
def list_all_diagnoses(
    admin: AdminUser,
    db: DbSession,
    pagination: Pagination,
    class_code: str | None = Query(default=None),
    status: Literal["processing", "completed", "failed"] | None = Query(default=None),
    user_id: str | None = Query(default=None),
    q: str | None = Query(default=None, max_length=200),
) -> AdminDiagnosisListResponse:
    items, total = diagnosis_crud.list_all(
        db,
        page=pagination.page,
        page_size=pagination.page_size,
        class_code=class_code,
        status=status,
        user_id=user_id,
        q=q,
    )
    return AdminDiagnosisListResponse(
        items=[AdminDiagnosisResponse.from_model(d) for d in items],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
    )


@router.patch("/diagnoses/{diagnosis_id}", response_model=AdminDiagnosisResponse)
def update_diagnosis(diagnosis_id: uuid.UUID, payload: AdminDiagnosisUpdate,
                     admin: AdminUser, db: DbSession) -> AdminDiagnosisResponse:
    diagnosis = diagnosis_crud.get_by_id(db, diagnosis_id)
    if diagnosis is None:
        raise NotFoundError("ไม่พบผลการตรวจวิเคราะห์นี้")
    if diagnosis.status == "processing":
        raise ConflictError("รอให้การตรวจวิเคราะห์เสร็จก่อนแก้ไข")
    disease = disease_crud.get_by_code(db, payload.class_code) if payload.class_code else None
    if payload.status == "completed" and disease is None:
        raise BadRequestError("ไม่พบประเภทโรคที่เลือก")
    diagnosis.disease_class = disease
    diagnosis.confidence_score = payload.confidence_score
    diagnosis.status = payload.status
    diagnosis.failure_reason = None
    diagnosis.class_probabilities = None
    diagnosis.model_version = "admin-corrected"
    db.commit()
    db.refresh(diagnosis)
    return AdminDiagnosisResponse.from_model(diagnosis)


@router.delete("/diagnoses/{diagnosis_id}", status_code=204)
def delete_diagnosis(diagnosis_id: uuid.UUID, admin: AdminUser, db: DbSession) -> Response:
    diagnosis = diagnosis_crud.get_by_id(db, diagnosis_id)
    if diagnosis is None:
        raise NotFoundError("ไม่พบผลการตรวจวิเคราะห์นี้")
    if diagnosis.status == "processing":
        raise ConflictError("รอให้การตรวจวิเคราะห์เสร็จก่อนลบ")
    db.delete(diagnosis)
    db.commit()
    return Response(status_code=204)


@router.get("/surveys", response_model=AdminSurveyListResponse)
def list_surveys(admin: AdminUser, db: DbSession, pagination: Pagination,
                 user_id: uuid.UUID | None = Query(default=None)) -> AdminSurveyListResponse:
    items, total = survey_crud.list_all(db, page=pagination.page, page_size=pagination.page_size, user_id=user_id)
    return AdminSurveyListResponse(
        items=[AdminSurveyResponse(**SurveyResponse.from_model(s).model_dump(),
                                   user_id=s.user_id, user_name=s.user.full_name, user_email=s.user.email) for s in items],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
    )


@router.get("/surveys/summary", response_model=SurveySummaryResponse)
def get_survey_summary(admin: AdminUser, db: DbSession) -> SurveySummaryResponse:
    return SurveySummaryResponse(**survey_crud.get_summary(db))
