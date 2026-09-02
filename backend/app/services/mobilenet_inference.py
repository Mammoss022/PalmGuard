"""AI inference — local MobileNetV2 model, trained by the ../ai/ package.

Implements the flow: Upload -> FastAPI -> [Gemini: is this a palm leaf?] ->
Preprocess -> MobileNetV2 -> Prediction -> Confidence Check -> Save DB ->
Response. Reuses ai/src's already-built-and-tested preprocessing/model/predict
code directly (by putting ai/ on sys.path) rather than duplicating that logic
in the Backend.

Real trained model: ai/models/mobilenetv2-v1.2.keras (3 classes — Brown_Spot,
Healthy, White_Scale, no NON_PALM of its own). settings.AI_BACKEND=mobilenet
is the default now; settings.MOBILENET_MODEL_PATH points at that file.
The `ai_inference.is_palm_leaf()` Gemini gate runs first specifically because
this model has no NON_PALM class — see that function's docstring.
"""

import sys
from pathlib import Path

from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.services import ai_inference
from app.services.ai_inference import InferenceError, InferenceResult

_AI_PACKAGE_DIR = Path(__file__).resolve().parents[3] / "ai"
if str(_AI_PACKAGE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_PACKAGE_DIR))

_model_cache: dict[str, object] = {}


def _load_model():
    if not settings.MOBILENET_MODEL_PATH:
        raise InferenceError(
            "ยังไม่ได้ตั้งค่า MOBILENET_MODEL_PATH — ยังไม่มีโมเดล MobileNetV2 ที่เทรนจริง (ดู ai/README.md)"
        )

    model_path = Path(settings.MOBILENET_MODEL_PATH)
    if not model_path.exists():
        raise InferenceError(f"ไม่พบไฟล์โมเดลที่ {model_path}")

    key = str(model_path)
    if key not in _model_cache:
        from src.predict import load_model_for_inference  # ai/src/predict.py

        _model_cache[key] = load_model_for_inference(model_path)
    return _model_cache[key]


def _predict_sync(image_bytes: bytes) -> dict:
    """Runs the blocking (model-load + forward-pass) work — call via run_in_threadpool."""
    import config as ai_config  # ai/config.py
    from src.predict import predict as ai_predict  # ai/src/predict.py

    model = _load_model()
    try:
        return ai_predict(image_bytes, model, model_version=f"mobilenetv2:{ai_config.MODEL_VERSION}")
    except ValueError as exc:
        # ai/src/preprocessing.py rejects corrupt/invalid image bytes this way.
        raise InferenceError(str(exc)) from exc


async def run_inference(image_bytes: bytes, content_type: str = "image/jpeg") -> InferenceResult:
    if not await ai_inference.is_palm_leaf(image_bytes, content_type):
        raise InferenceError("ไม่พบใบปาล์มน้ำมันที่ชัดเจนในภาพนี้ กรุณาถ่ายภาพใบปาล์มน้ำมันให้ชัดเจน")

    # TensorFlow's model.predict() is a blocking call with no async API — run it
    # off the event loop, matching how app/services/ai_inference.py's Gemini
    # path uses an async HTTP client instead of blocking on network I/O.
    result = await run_in_threadpool(_predict_sync, image_bytes)

    import config as ai_config  # ai/config.py

    if result["class_code"] == ai_config.UNKNOWN_CLASS_CODE:
        # UNKNOWN isn't a disease_classes row (docs/DATABASE.md) — it means the
        # model wasn't confident in any of the 4 trained classes, not a result
        # to persist. Same "Low Confidence" outcome as docs/AI_MODEL.md#confidence.
        raise InferenceError("ความเชื่อมั่นของผลวิเคราะห์ต่ำเกินไป กรุณาถ่ายภาพให้ชัดเจนขึ้น")

    return InferenceResult(
        class_code=result["class_code"],
        confidence_score=result["confidence_score"],
        model_version=result["model_version"],
        class_probabilities=result.get("class_probabilities"),
    )
