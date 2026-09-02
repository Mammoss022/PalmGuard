"""Run evaluation (Validation/Testing steps) — docs/AI_MODEL.md#evaluation-metrics.

Usable both mid-training (validation set) and after training (holdout
test set) since it just needs a model and a labeled tf.data.Dataset.
"""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config  # noqa: E402
from src import metrics  # noqa: E402


def evaluate_dataset(model, dataset, class_names: list[str] = config.CLASS_NAMES) -> dict:
    y_true: list[int] = []
    y_prob: list[np.ndarray] = []

    for images, labels in dataset:
        probs = model.predict(images, verbose=0)
        y_prob.append(probs)
        y_true.extend(labels.numpy().tolist())

    y_prob_arr = np.concatenate(y_prob, axis=0)
    y_pred = np.argmax(y_prob_arr, axis=1)

    return metrics.build_report(np.array(y_true), y_pred, class_names, y_prob=y_prob_arr)
