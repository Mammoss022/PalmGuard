import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.schemas.datetime import UtcDateTime

LeafClass = Literal["HEALTHY", "BROWN_SPOT", "WHITE_SCALE"]
Symptom = Literal["brown_spots", "white_scales", "yellowing", "drying", "wilting"]


class AssessmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_class_code: LeafClass
    severity_score: int = Field(ge=1, le=5)
    symptoms: list[Symptom] = Field(default_factory=list, max_length=5)

    @field_validator("symptoms")
    @classmethod
    def unique_symptoms(cls, value):
        return list(dict.fromkeys(value))

    @model_validator(mode="after")
    def check_healthy(self):
        if self.expected_class_code == "HEALTHY" and (self.symptoms or self.severity_score != 1):
            raise ValueError("Healthy leaves must have no symptoms and severity 1")
        return self


class AssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    diagnosis_id: uuid.UUID
    expected_class_code: LeafClass
    severity_score: int
    risk_level: str
    symptoms: list[Symptom]
    created_at: UtcDateTime
