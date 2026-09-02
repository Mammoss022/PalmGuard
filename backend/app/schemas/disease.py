from pydantic import BaseModel, ConfigDict


class DiseaseClassResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name_th: str
    name_en: str
    description: str | None
    recommendation_th: str | None
