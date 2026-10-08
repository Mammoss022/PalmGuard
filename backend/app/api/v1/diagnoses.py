import logging

from fastapi import APIRouter, File, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
import uuid

from app.api.deps import CurrentUser, DbSession, Pagination
from app.core.config import settings
from app.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.models.leaf_assessment import LeafAssessment
from app.schemas.assessment import AssessmentCreate, AssessmentResponse
from app.crud import diagnosis as diagnosis_crud
from app.crud import disease as disease_crud
from app.schemas.diagnosis import DiagnosisListResponse, DiagnosisResponse
from app.services import inference
from app.services.storage import CONTENT_TYPE_EXTENSIONS, storage

logger = logging.getLogger("palmguard")

router = APIRouter()


@router.get("/{diagnosis_id}/assessment", response_model=AssessmentResponse | None)
def get_assessment(diagnosis_id: uuid.UUID, current_user: CurrentUser, db: DbSession):
    diagnosis = diagnosis_crud.get_by_id(db, diagnosis_id)
    if diagnosis is None:
        raise NotFoundError("ไม่พบผลการตรวจวิเคราะห์")
    if diagnosis.user_id != current_user.id and current_user.role != "admin":
        raise ForbiddenError("คุณไม่มีสิทธิ์เข้าถึงแบบประเมินนี้")
    return db.scalar(select(LeafAssessment).where(LeafAssessment.diagnosis_id == diagnosis_id))


@router.post("/{diagnosis_id}/assessment", response_model=AssessmentResponse, status_code=201)
def create_assessment(diagnosis_id: uuid.UUID, payload: AssessmentCreate, current_user: CurrentUser, db: DbSession):
    diagnosis = diagnosis_crud.get_by_id(db, diagnosis_id)
    if diagnosis is None:
        raise NotFoundError("ไม่พบผลการตรวจวิเคราะห์")
    if diagnosis.user_id != current_user.id:
        raise ForbiddenError("ส่งแบบประเมินได้เฉพาะผลตรวจของตนเอง")
    if diagnosis.status == "processing":
        raise ConflictError("กรุณารอให้การตรวจวิเคราะห์เสร็จก่อน")
    if db.scalar(select(LeafAssessment.id).where(LeafAssessment.diagnosis_id == diagnosis_id)):
        raise ConflictError("รายการนี้ส่งแบบประเมินแล้ว")
    original_ai = diagnosis.status == "completed" and diagnosis.model_version != "admin-corrected"
    assessment = LeafAssessment(diagnosis_id=diagnosis_id, user_id=current_user.id,
        **payload.model_dump(), ai_class_code=diagnosis.disease_class.code if original_ai and diagnosis.disease_class else None,
        ai_model_version=diagnosis.model_version if original_ai else None)
    db.add(assessment)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("รายการนี้ส่งแบบประเมินแล้ว") from exc
    db.refresh(assessment)
    return assessment


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
        message = str(exc)
        # Return photo-related guidance only; keep service details in the log.
        safe_prefixes = ("โมเดลยังแยกโรค", "ความเชื่อมั่น", "ไม่พบใบปาล์มน้ำมัน", "ไฟล์ภาพไม่ถูกต้อง", "AI ไม่สามารถจำแนก")
        reason = message if message.startswith(safe_prefixes) else "ระบบวิเคราะห์ภาพไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง"
        diagnosis = diagnosis_crud.mark_failed(db, diagnosis, reason=reason)
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
