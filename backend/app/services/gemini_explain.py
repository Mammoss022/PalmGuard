"""Gemini-generated explanation/recommendation for an already-known class.

Splits concerns per the intended hybrid architecture:
    MobileNetV2 -> ตรวจ Class (mobilenet_inference.py decides *what* it is)
    Gemini      -> อธิบาย/แนะนำ (this module explains it in natural Thai)

This is distinct from app/services/ai_inference.py, which asks Gemini to do
BOTH classification and explanation — that all-in-one approach is the stand-in
used today only because no MobileNetV2 model is trained yet (ai/data/raw has
no images). Once one exists, mobilenet_inference.py classifies and this module
explains, instead of asking Gemini to also guess the class.

Not yet wired into the diagnosis-creation flow — see the "not persisted"
note in docstring of explain_class() below before connecting it.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("palmguard.ai")

# Thai class labels for the prompt — separate from disease_classes.name_th
# (DB) since this only needs to be readable inside the prompt, not stored.
_CLASS_LABELS_TH = {
    "HEALTHY": "ใบปกติ (Healthy)",
    "BROWN_SPOT": "ใบจุดสีน้ำตาล (Brown Spot)",
    "WHITE_SCALE": "เพลี้ยหอย (White Scale)",
    "NON_PALM": "ภาพที่ไม่ใช่ใบปาล์มน้ำมัน (Non-Palm)",
}

_PROMPT_TEMPLATE = """คุณเป็นผู้เชี่ยวชาญด้านโรคพืชปาล์มน้ำมัน

ระบบ AI วิเคราะห์ภาพใบปาล์มน้ำมันแล้ว และจำแนกได้ว่าอยู่ในกลุ่ม: {class_label}

กรุณาอธิบายอาการนี้และให้คำแนะนำเบื้องต้นแก่เกษตรกรเป็นภาษาไทย กระชับ อ่านง่าย
ไม่เกิน 3-4 ประโยค ตอบเป็นข้อความธรรมดา ห้ามตอบเป็น JSON
"""


class ExplainError(Exception):
    """Raised when Gemini can't produce an explanation (network/API error)."""


async def explain_class(class_code: str) -> str:
    """Returns a short Thai explanation/recommendation for an already-decided class.

    NOTE — not yet called from the diagnosis-creation flow: the Diagnosis
    model/DB has no column to persist a per-diagnosis dynamic explanation
    (only the static disease_classes.recommendation_th). Wiring this in means
    either (a) generate on every read instead of storing it (extra Gemini
    calls, and history could show different text each time), or (b) add a
    column and migration. Neither has been decided — see docs/AI_MODEL.md.
    """
    if not settings.GEMINI_API_KEY:
        raise ExplainError("GEMINI_API_KEY ยังไม่ได้ตั้งค่าในฝั่ง Backend")

    label = _CLASS_LABELS_TH.get(class_code.upper(), class_code)
    prompt = _PROMPT_TEMPLATE.format(class_label=label)

    url = f"{settings.GEMINI_BASE_URL}/models/{settings.GEMINI_MODEL}:generateContent"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 300},
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json=body,
                headers={"X-Goog-Api-Key": settings.GEMINI_API_KEY, "Content-Type": "application/json"},
            )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.exception("Gemini explain call failed")
        raise ExplainError("เรียกใช้งาน AI เพื่ออธิบายผลไม่สำเร็จ") from exc

    data = response.json()
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise ExplainError("Gemini ไม่ได้ส่งคำอธิบายกลับมา") from exc

    return text.strip()
