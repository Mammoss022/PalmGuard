import logging

from fastapi import APIRouter, File, UploadFile, status

from app.api.deps import CurrentUser, DbSession, Pagination
from app.core.config import settings
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.crud import diagnosis as diagnosis_crud
from app.crud import disease as disease_crud
from app.schemas.diagnosis import DiagnosisListResponse, DiagnosisResponse
from app.services import inference
from app.services.storage import CONTENT_TYPE_EXTENSIONS, storage

logger = logging.getLogger("palmguard")

router = APIRouter()


@router.post("", response_model=DiagnosisResponse, status_code=status.HTTP_201_CREATED)
async def create_diagnosis(
    current_user: CurrentUser,
    db: DbSession,
    image: UploadFile = File(...),
) -> DiagnosisResponse:
    if image.content_type not in CONTENT_TYPE_EXTENSIONS:
        raise BadRequestError(
            "รองรับเฉพาะไฟล์ภาพชนิด JPEG, PNG หรือ WEBP เท่านั้น",
            details=[{"field": "image", "issue": f"unsupported content_type: {image.content_type}"}],
        )

    content = await image.read()
    if len(content) > settings.max_upload_size_bytes:
        raise BadRequestError(
            f"ขนาดไฟล์ภาพต้องไม่เกิน {settings.MAX_UPLOAD_SIZE_MB} MB",
            details=[{"field": "image", "issue": "file too large"}],
        )
    if len(content) == 0:
        raise BadRequestError("ไฟล์ภาพว่างเปล่า", details=[{"field": "image", "issue": "empty file"}])

    image_url = storage.save(content, image.content_type)
    diagnosis = diagnosis_crud.create(db, user_id=current_user.id, image_url=image_url)

    try:
        result = await inference.run_inference(content, image.content_type)
    except inference.InferenceError as exc:
        logger.warning("Diagnosis %s failed AI inference: %s", diagnosis.id, exc)
        diagnosis = diagnosis_crud.mark_failed(db, diagnosis)
        return DiagnosisResponse.from_model(diagnosis)

    disease_class = disease_crud.get_by_code(db, result.class_code)
    diagnosis = diagnosis_crud.mark_completed(
        db,
        diagnosis,
        class_id=disease_class.id,
        confidence_score=result.confidence_score,
        model_version=result.model_version,
        class_probabilities=result.class_probabilities,
    )
    return DiagnosisResponse.from_model(diagnosis)


@router.get("", response_model=DiagnosisListResponse)
def list_my_diagnoses(current_user: CurrentUser, db: DbSession, pagination: Pagination) -> DiagnosisListResponse:
    items, total = diagnosis_crud.list_by_user(
        db, user_id=current_user.id, page=pagination.page, page_size=pagination.page_size
    )
    return DiagnosisListResponse(
        items=[DiagnosisResponse.from_model(d) for d in items],
        page=pagination.page,
        page_size=pagination.page_size,
        total=total,
    )


@router.get("/{diagnosis_id}", response_model=DiagnosisResponse)
def get_diagnosis(diagnosis_id: str, current_user: CurrentUser, db: DbSession) -> DiagnosisResponse:
    diagnosis = diagnosis_crud.get_by_id(db, diagnosis_id)
    if diagnosis is None:
        raise NotFoundError("ไม่พบรายการวินิจฉัยนี้")
    if diagnosis.user_id != current_user.id and current_user.role != "admin":
        raise ForbiddenError("คุณไม่มีสิทธิ์เข้าถึงรายการวินิจฉัยนี้")
    return DiagnosisResponse.from_model(diagnosis)
