from fastapi import APIRouter

from app.api.deps import DbSession
from app.core.exceptions import NotFoundError
from app.crud import disease as disease_crud
from app.schemas.disease import DiseaseClassResponse

router = APIRouter()


@router.get("", response_model=list[DiseaseClassResponse])
def list_diseases(db: DbSession) -> list[DiseaseClassResponse]:
    diseases = disease_crud.list_all(db)
    return [DiseaseClassResponse.model_validate(d) for d in diseases]


@router.get("/{code}", response_model=DiseaseClassResponse)
def get_disease(code: str, db: DbSession) -> DiseaseClassResponse:
    disease = disease_crud.get_by_code(db, code)
    if disease is None:
        raise NotFoundError(f"ไม่พบ Disease Class รหัส '{code}'")
    return DiseaseClassResponse.model_validate(disease)
