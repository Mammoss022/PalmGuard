from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.crud import survey as survey_crud
from app.schemas.survey import SurveyCreateRequest, SurveyResponse

router = APIRouter()


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
