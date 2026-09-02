"""AI inference — real calls to Google Gemini Vision, scoped to oil palm leaves.

Two uses:
1. `run_inference()` — full classification (AI_BACKEND=gemini), ported from
   ~/BaiScan's googleAiService.ts. Gemini reasons over the photo directly and
   returns one of PalmGuard's 4 disease_classes (docs/DATABASE.md), including
   NON_PALM — a real disease_classes row (app/db/seed.py), not just a
   rejection path.
2. `is_palm_leaf()` — a lightweight yes/no pre-check called from
   app/services/mobilenet_inference.py (AI_BACKEND=mobilenet, the default).
   The locally trained model (ai/models/mobilenetv2-v1.2.keras) has only 3
   classes and no NON_PALM of its own (see ai/config.py, docs/AI_MODEL.md#limitations)
   — without this gate it forces every photo into one of those 3 no matter
   how unrelated. Both backends end up agreeing on rejecting non-palm photos,
   just via different mechanisms.
"""

import base64
import json
import logging
from dataclasses import dataclass

import httpx

from app.core.config import settings

logger = logging.getLogger("palmguard.ai")

_VALID_CLASSES = {"HEALTHY", "BROWN_SPOT", "WHITE_SCALE", "NON_PALM"}

_PROMPT = """คุณเป็นผู้เชี่ยวชาญด้านโรคพืชปาล์มน้ำมัน วิเคราะห์ภาพนี้อย่างละเอียด
แล้วจำแนกภาพนี้เป็นหนึ่งใน 4 กลุ่มนี้เท่านั้น:

- "HEALTHY": ใบปาล์มน้ำมัน สีเขียวสม่ำเสมอ ไม่พบจุดหรือร่องรอยความเสียหาย
- "BROWN_SPOT": ใบปาล์มน้ำมัน พบจุดสีน้ำตาลกระจายบนใบ (โรคใบจุด)
- "WHITE_SCALE": ใบปาล์มน้ำมัน พบคราบ/จุดสีขาวคล้ายเกล็ดของเพลี้ยหอยเกาะอยู่บนใบ
- "NON_PALM": ภาพนี้ไม่ใช่ใบปาล์มน้ำมัน เช่น แมว คน รถ ต้นไม้ชนิดอื่น ใบไม้ชนิดอื่น
  ดิน ท้องฟ้า หรือสิ่งของทั่วไป

ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น รูปแบบ:
{"class_code": "HEALTHY|BROWN_SPOT|WHITE_SCALE|NON_PALM", "confidence": 0.0,
 "probabilities": {"HEALTHY": 0.0, "BROWN_SPOT": 0.0, "WHITE_SCALE": 0.0}}

confidence คือความมั่นใจของคุณในผลการจำแนก (class_code ที่เลือก) ค่าระหว่าง 0.0 ถึง 1.0
probabilities คือความน่าจะเป็นที่คุณประเมินสำหรับแต่ละกลุ่มโรค (ไม่รวม NON_PALM) รวมกันได้ประมาณ 1.0
"""

_GATE_PROMPT = """คุณกำลังช่วยแอปวินิจฉัยโรคใบปาล์มน้ำมันสำหรับเกษตรกร ภาพที่ส่งมาส่วนใหญ่เป็นภาพถ่ายระยะใกล้
มากๆ (macro) ของใบปาล์มที่เป็นโรคหรือมีแมลง ซึ่งอาจดูแปลกตา ไม่เห็นทั้งต้น หรือมีลวดลาย/จุด/คราบขาว
หนาแน่นปกคลุมจนดูเหมือนพื้นผิวอื่น

หน้าที่ของคุณ: ตอบว่าภาพนี้มีส่วนของ *ใบปาล์ม* ปรากฏอยู่หรือไม่ (ไม่ต้องสมบูรณ์ทั้งใบ) โดยเอียงไปทาง
ตอบ true หากยังพอเห็นเค้าโครงใบเรียวยาว/ก้านใบ/ใบย่อยเรียงแถว แม้จะมีรอยโรค คราบ หรือแมลงเกาะแน่นก็ตาม
ให้ตอบ false เฉพาะเมื่อภาพนั้นชัดเจนว่าเป็นสิ่งอื่นที่ไม่เกี่ยวกับพืชปาล์มเลย เช่น คน สัตว์ รถ เอกสาร
หน้าจอ สิ่งของ หรือพื้นผิวที่ไม่ใช่พืชเลย

ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น รูปแบบ:
{"is_palm_leaf": true, "confidence": 0.0}

confidence คือความมั่นใจของคุณ ค่าระหว่าง 0.0 ถึง 1.0
"""


@dataclass
class InferenceResult:
    class_code: str
    confidence_score: float
    model_version: str
    # Per-class probability breakdown (disease_classes.code -> 0.0-1.0), for the
    # 3 real disease classes only (never includes NON_PALM/UNKNOWN) — None when
    # the backend couldn't produce one (e.g. Gemini didn't return a parseable
    # "probabilities" object). See docs/AI_MODEL.md#prediction.
    class_probabilities: dict[str, float] | None = None


class InferenceError(Exception):
    """Raised whenever the image can't produce a usable diagnosis result.

    Callers (app/api/v1/diagnoses.py) catch this and mark the Diagnosis row
    status="failed" — this is an expected outcome (bad photo, non-palm image,
    low confidence, API hiccup), not a 500.
    """


def _parse_response_text(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise InferenceError("แปลงผลลัพธ์จาก AI ไม่สำเร็จ") from exc


async def _call_gemini(
    prompt: str,
    image_bytes: bytes,
    content_type: str,
    max_output_tokens: int = 400,
    model: str | None = None,
) -> str:
    if not settings.GEMINI_API_KEY:
        raise InferenceError(
            "GEMINI_API_KEY ยังไม่ได้ตั้งค่าในฝั่ง Backend — ดู backend/.env.example"
        )

    url = f"{settings.GEMINI_BASE_URL}/models/{model or settings.GEMINI_MODEL}:generateContent"
    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": content_type,
                            "data": base64.b64encode(image_bytes).decode("ascii"),
                        }
                    },
                ]
            }
        ],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": max_output_tokens},
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                url,
                json=body,
                headers={
                    "X-Goog-Api-Key": settings.GEMINI_API_KEY,
                    "Content-Type": "application/json",
                },
            )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.exception("Gemini API returned an error status")
        raise InferenceError(f"เรียกใช้งาน AI ไม่สำเร็จ (HTTP {exc.response.status_code})") from exc
    except httpx.HTTPError as exc:
        logger.exception("Gemini API call failed")
        raise InferenceError("เรียกใช้งาน AI ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง") from exc

    data = response.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise InferenceError("Gemini ไม่ได้ส่งผลลัพธ์กลับมา") from exc


async def is_palm_leaf(image_bytes: bytes, content_type: str = "image/jpeg") -> bool:
    """Lightweight pre-check used by the mobilenet backend (app/services/mobilenet_inference.py)
    to catch a non-palm photo before running the local classifier — models/mobilenetv2-v1.2.keras
    has no NON_PALM class of its own (see ai/config.py, docs/AI_MODEL.md#limitations) and, without
    this gate, forces every photo into one of its 3 trained classes no matter how unrelated (a
    photo of a person got classified "White Scale" at 92% confidence before this was added).

    Fails open: if the Gemini call itself errors out (bad key, network, rate limit), this returns
    True — assume it IS a palm leaf — so a Gemini outage doesn't take down local-model diagnosis
    entirely. The local model's own confidence threshold is the fallback safety net in that case.
    """
    try:
        # Uses GEMINI_GATE_MODEL (a "-lite" model), not GEMINI_MODEL — the latter is a
        # "thinking" model that answers this same yes/no question correctly but takes
        # 20-35s doing it; the lite model gets there in ~1-2s. See Settings.GEMINI_GATE_MODEL.
        text = await _call_gemini(
            _GATE_PROMPT, image_bytes, content_type, model=settings.GEMINI_GATE_MODEL
        )
        parsed = _parse_response_text(text)
        return bool(parsed.get("is_palm_leaf", True))
    except InferenceError:
        logger.warning("Palm-leaf gate check failed; proceeding without it", exc_info=True)
        return True


async def run_inference(image_bytes: bytes, content_type: str = "image/jpeg") -> InferenceResult:
    text = await _call_gemini(_PROMPT, image_bytes, content_type)
    parsed = _parse_response_text(text)

    class_code = str(parsed.get("class_code") or "").upper()
    if class_code not in _VALID_CLASSES:
        raise InferenceError("AI ไม่สามารถจำแนกกลุ่มอาการของใบนี้ได้")

    try:
        confidence = float(parsed.get("confidence") or 0.0)
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = min(max(confidence, 0.0), 1.0)

    if confidence < settings.MIN_CONFIDENCE_THRESHOLD:
        raise InferenceError("ความเชื่อมั่นของผลวิเคราะห์ต่ำเกินไป กรุณาถ่ายภาพให้ชัดเจนขึ้น")

    class_probabilities = _parse_class_probabilities(parsed.get("probabilities"))

    return InferenceResult(
        class_code=class_code,
        confidence_score=confidence,
        model_version=f"gemini:{settings.GEMINI_MODEL}",
        class_probabilities=class_probabilities,
    )


def _parse_class_probabilities(raw: object) -> dict[str, float] | None:
    """Best-effort parse of the Gemini "probabilities" object — None (not an
    error) if it's missing or malformed, since it's a nice-to-have breakdown
    on top of the required class_code/confidence, not required for a valid
    diagnosis (see docs/AI_MODEL.md#prediction).
    """
    if not isinstance(raw, dict):
        return None

    result: dict[str, float] = {}
    for code in ("HEALTHY", "BROWN_SPOT", "WHITE_SCALE"):
        try:
            value = float(raw.get(code, 0.0))
        except (TypeError, ValueError):
            return None
        result[code] = min(max(value, 0.0), 1.0)
    return result
