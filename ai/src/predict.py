"""Prediction function — docs/AI_MODEL.md#prediction / #confidence.

    Prediction: Class = argmax(softmax output)
    Confidence: the winning class's softmax probability

This is the function a future Backend AI-integration phase would call
from app/services/ai_inference.py (not wired up here — out of scope for
this AI Model phase, see docs/ARCHITECTURE.md#ai-architecture).
"""

import sys
from pathlib import Path

import keras
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config  # noqa: E402
from src.preprocessing import ImageSource, prepare_model_input  # noqa: E402

_model_cache: dict[str, keras.Model] = {}


def load_model_for_inference(model_path: str | Path) -> keras.Model:
    """Loads (and caches) an exported .keras model for repeated inference calls."""
    key = str(model_path)
    if key not in _model_cache:
        _model_cache[key] = keras.models.load_model(model_path)
    return _model_cache[key]


def predict(
    image: ImageSource,
    model: keras.Model,
    model_version: str = config.MODEL_VERSION,
    confidence_threshold: float = config.MIN_CONFIDENCE_THRESHOLD,
) -> dict:
    """Runs one image through the model.

    Returns a dict shaped like docs/API.md's diagnosis "result" block:
        {"class_code": str, "confidence_score": float, "model_version": str}

    This model has no NON_PALM class (config.CLASS_NAMES — 3 real disease
    classes only), so the confidence threshold is the only guard: a
    low-confidence winner is reported as UNKNOWN rather than trusting
    whichever of the 3 classes happened to score highest. That also covers
    (imperfectly) the case of a non-palm photo, since none of the 3 trained
    classes should score confidently on it.
    """
    batch = prepare_model_input(image)
    input_shape = model.input_shape
    if isinstance(input_shape, list) or len(input_shape) != batch.ndim:
        raise ValueError("Model must accept a single NHWC image batch")
    if any(expected is not None and expected != actual
           for expected, actual in zip(input_shape, batch.shape)):
        raise ValueError(
            f"Model input shape {input_shape} does not match image batch {batch.shape}"
        )

    probs = model.predict(batch, verbose=0)[0]
    class_index = int(np.argmax(probs))
    confidence = float(probs[class_index])
    predicted_class = config.CLASS_NAMES[class_index]

    class_code = predicted_class if confidence >= confidence_threshold else config.UNKNOWN_CLASS_CODE

    # Full softmax breakdown, keyed by disease_classes.code (UPPER_CASE) —
    # docs/AI_MODEL.md#classes — so the caller (mobilenet_inference.py) can
    # show "probability per class" instead of just the winning class's score.
    class_probabilities = {name.upper(): float(p) for name, p in zip(config.CLASS_NAMES, probs)}

    return {
        "class_code": class_code,
        "confidence_score": confidence,
        "model_version": model_version,
        "class_probabilities": class_probabilities,
    }
