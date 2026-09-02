"""Image preprocessing — docs/AI_MODEL.md#image-preprocessing.

Uses PIL as the canonical loader (works uniformly for a file path or raw
bytes) and OpenCV for a lightweight decode-validity check, per the
"OpenCV/PIL สำหรับ Image Processing" requirement in docs/PROJECT.md.

MobileNetV2's own [-1, 1] rescaling is baked into the model itself (see
src/model.py) so this module intentionally stops at "resized RGB
float32 array in [0, 255]" — the same contract at train time (via
src/dataset.py) and at inference time (via src/predict.py).
"""

import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image, UnidentifiedImageError

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config  # noqa: E402

ImageSource = str | Path | bytes


def is_valid_image_bytes(data: bytes) -> bool:
    """Cheap corruption/format check using OpenCV before doing real work."""
    import cv2

    array = np.frombuffer(data, dtype=np.uint8)
    decoded = cv2.imdecode(array, cv2.IMREAD_COLOR)
    return decoded is not None


def load_image(source: ImageSource) -> Image.Image:
    """Load an image from a path or raw bytes and normalize to RGB."""
    try:
        if isinstance(source, (bytes, bytearray)):
            image = Image.open(io.BytesIO(source))
        else:
            image = Image.open(source)
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("ไฟล์ภาพไม่ถูกต้องหรือเสียหาย") from exc

    return image.convert("RGB")


def preprocess_image(image: Image.Image) -> np.ndarray:
    """Resize to the model's input size. Returns float32 pixels in [0, 255]."""
    resized = image.resize(config.IMG_SIZE, Image.BILINEAR)
    return np.asarray(resized, dtype=np.float32)


def load_and_preprocess(source: ImageSource) -> np.ndarray:
    """End-to-end: validate + load + resize. Used by src/predict.py."""
    if isinstance(source, (bytes, bytearray)):
        if not is_valid_image_bytes(bytes(source)):
            raise ValueError("ไฟล์ภาพไม่ถูกต้องหรือเสียหาย")
    image = load_image(source)
    return preprocess_image(image)
