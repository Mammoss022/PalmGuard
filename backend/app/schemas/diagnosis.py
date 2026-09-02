import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.diagnosis import Diagnosis


class DiagnosisResult(BaseModel):
    class_code: str
    name_th: str
    confidence_score: float
    recommendation_th: str | None
    # Per-class probability breakdown (disease_classes.code -> 0.0-1.0) for the
    # 3 real disease classes — None for diagnoses predating this field, or
    # when the AI backend couldn't produce one (docs/API.md).
    class_probabilities: dict[str, float] | None = None


class DiagnosisResponse(BaseModel):
    id: uuid.UUID
    image_url: str
    status: str
    result: DiagnosisResult | None = None
    created_at: datetime

    @classmethod
    def from_model(cls, diagnosis: Diagnosis) -> "DiagnosisResponse":
        result = None
        if diagnosis.status == "completed" and diagnosis.disease_class is not None:
            result = DiagnosisResult(
                class_code=diagnosis.disease_class.code,
                name_th=diagnosis.disease_class.name_th,
                confidence_score=float(diagnosis.confidence_score)
                if diagnosis.confidence_score is not None
                else 0.0,
                recommendation_th=diagnosis.disease_class.recommendation_th,
                class_probabilities=diagnosis.class_probabilities,
            )
        return cls(
            id=diagnosis.id,
            image_url=diagnosis.image_url,
            status=diagnosis.status,
            result=result,
            created_at=diagnosis.created_at,
        )


class DiagnosisListResponse(BaseModel):
    items: list[DiagnosisResponse]
    page: int
    page_size: int
    total: int
