"""Export the trained model — docs/AI_MODEL.md#model-deployment /
#model-versioning.

Saved in Keras 3's native `.keras` format (not the legacy `.h5`) under a
versioned filename `mobilenetv2-<version>.keras`, matching the
`model_version` string recorded on a Diagnosis row (docs/DATABASE.md#diagnoses).
"""

import sys
from pathlib import Path

import keras

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config  # noqa: E402


def export_model(model: keras.Model, version: str = config.MODEL_VERSION, output_dir: Path = config.MODELS_DIR) -> Path:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"mobilenetv2-{version}.keras"
    model.save(path)
    return path
