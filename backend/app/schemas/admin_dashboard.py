from pydantic import BaseModel, Field
from app.schemas.datetime import UtcDateTime


class CountItem(BaseModel):
    code: str
    label: str
    count: int


class UserOverview(BaseModel):
    total: int
    new_users: int
    active_users: int
    admins: int
    farmers: int


class AiOverview(BaseModel):
    total: int
    completed: int
    failed: int
    processing: int
    mean_confidence: float | None
    low_confidence: int
    admin_corrected: int
    diseases: list[CountItem]
    daily: list[CountItem]


class AssessmentOverview(BaseModel):
    total: int
    mean_severity: float | None
    risks: list[CountItem]
    symptoms: list[CountItem]
    satisfaction_count: int
    mean_satisfaction: float | None
    mean_ease_of_use: float | None
    mean_accuracy_rating: float | None


class ComparisonCell(BaseModel):
    assessment_code: str
    ai_code: str
    count: int


class ComparisonOverview(BaseModel):
    eligible: int
    agreed: int
    disagreed: int
    excluded: int
    agreement_rate: float | None
    matrix: list[ComparisonCell]


class ClassMetric(BaseModel):
    code: str
    precision: float
    recall: float
    f1: float
    support: int


class EvaluationSet(BaseModel):
    name: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    support: int
    per_class: list[ClassMetric]


class ModelOverview(BaseModel):
    available: bool
    model_version: str | None = None
    source: str | None = None
    reason: str | None = None
    datasets: list[EvaluationSet] = Field(default_factory=list)


class AdminDashboardResponse(BaseModel):
    days: int
    start_at: UtcDateTime
    end_at: UtcDateTime
    users: UserOverview
    ai: AiOverview
    assessments: AssessmentOverview
    comparison: ComparisonOverview
    model: ModelOverview
