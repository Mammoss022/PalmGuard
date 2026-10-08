import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.satisfaction_survey import SatisfactionSurvey
from app.schemas.datetime import UtcDateTime


class SurveyCreateRequest(BaseModel):
    satisfaction_rating: int = Field(ge=1, le=5)
    ease_of_use_rating: int = Field(ge=1, le=5)
    accuracy_rating: int = Field(ge=1, le=5)
    would_recommend: bool
    comments: str | None = Field(default=None, max_length=1000)


class SurveyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    satisfaction_rating: int
    ease_of_use_rating: int
    accuracy_rating: int
    would_recommend: bool
    comments: str | None
    created_at: UtcDateTime

    @classmethod
    def from_model(cls, survey: SatisfactionSurvey) -> "SurveyResponse":
        return cls.model_validate(survey)


class SurveyListResponse(BaseModel):
    items: list[SurveyResponse]
    page: int
    page_size: int
    total: int


class SurveyStatusResponse(BaseModel):
    has_submitted: bool
    eligible_for_prompt: bool
    survey: SurveyResponse | None


class AdminSurveyResponse(SurveyResponse):
    user_id: uuid.UUID
    user_name: str
    user_email: str


class AdminSurveyListResponse(BaseModel):
    items: list[AdminSurveyResponse]
    page: int
    page_size: int
    total: int


class RatingDistribution(BaseModel):
    score: int
    count: int


class SurveySummaryResponse(BaseModel):
    total_responses: int
    avg_satisfaction_rating: float | None
    avg_ease_of_use_rating: float | None
    avg_accuracy_rating: float | None
    would_recommend_rate: float | None
    total_users: int = 0
    responded_users: int = 0
    recommend_count: int = 0
    not_recommend_count: int = 0
    satisfaction_distribution: list[RatingDistribution] = Field(default_factory=list)
    ease_of_use_distribution: list[RatingDistribution] = Field(default_factory=list)
    accuracy_distribution: list[RatingDistribution] = Field(default_factory=list)
