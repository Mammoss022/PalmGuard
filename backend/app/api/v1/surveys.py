from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.crud import survey as survey_crud
from app.schemas.survey import SurveyCreateRequest, SurveyResponse
from app.schemas.survey import SurveyStatusResponse
from sqlalchemy import select
from app.models.diagnosis import Diagnosis, STATUS_COMPLETED

router = APIRouter()


@router.get("/me", response_model=SurveyStatusResponse)
def get_my_survey(current_user: CurrentUser, db: DbSession) -> SurveyStatusResponse:
    survey = survey_crud.get_by_user(db, current_user.id)
    has_diagnosis = db.scalar(select(Diagnosis.id).where(
        Diagnosis.user_id == current_user.id, Diagnosis.status == STATUS_COMPLETED).limit(1)) is not None
    return SurveyStatusResponse(
        has_submitted=survey is not None,
        eligible_for_prompt=current_user.role != "admin" and has_diagnosis and survey is None,
        survey=SurveyResponse.from_model(survey) if survey else None,
    )


@router.post("", response_model=SurveyResponse, status_code=status.HTTP_201_CREATED)
def create_survey(payload: SurveyCreateRequest, current_user: CurrentUser, db: DbSession) -> SurveyResponse:
    survey = survey_crud.create(
        db,
        user_id=current_user.id,
        satisfaction_rating=payload.satisfaction_rating,
        ease_of_use_rating=payload.ease_of_use_rating,
        accuracy_rating=payload.accuracy_rating,
        would_recommend=payload.would_recommend,
        comments=payload.comments,
    )
    return SurveyResponse.from_model(survey)
