"""Single entry point for AI inference — dispatches to the configured backend.

app/api/v1/diagnoses.py should import from here, not from ai_inference or
mobilenet_inference directly, so switching backends is a one-line config
change (settings.AI_BACKEND) instead of an endpoint edit.
"""

from app.core.config import settings
from app.services import ai_inference, mobilenet_inference
from app.services.ai_inference import InferenceError, InferenceResult

__all__ = ["InferenceError", "InferenceResult", "run_inference"]


async def run_inference(image_bytes: bytes, content_type: str = "image/jpeg") -> InferenceResult:
    if settings.AI_BACKEND == "mobilenet":
        return await mobilenet_inference.run_inference(image_bytes, content_type)
    return await ai_inference.run_inference(image_bytes, content_type)
