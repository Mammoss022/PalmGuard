"""Evaluation metrics — docs/AI_MODEL.md#evaluation-metrics.

Plain NumPy implementation (Accuracy, Precision, Recall, F1 per class,
Confusion Matrix, ROC AUC) to stick to the declared stack in docs/PROJECT.md
(Python, TensorFlow/Keras, OpenCV/PIL) without adding an extra library
(no scikit-learn).
"""

import numpy as np


def confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray, num_classes: int) -> np.ndarray:
    cm = np.zeros((num_classes, num_classes), dtype=np.int64)
    for t, p in zip(y_true, y_pred):
        cm[int(t), int(p)] += 1
    return cm


def accuracy(cm: np.ndarray) -> float:
    total = cm.sum()
    return float(np.trace(cm) / total) if total > 0 else 0.0


def precision_recall_f1_per_class(cm: np.ndarray) -> dict[int, dict[str, float]]:
    num_classes = cm.shape[0]
    result: dict[int, dict[str, float]] = {}
    for c in range(num_classes):
        tp = cm[c, c]
        fp = cm[:, c].sum() - tp
        fn = cm[c, :].sum() - tp
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        result[c] = {"precision": float(precision), "recall": float(recall), "f1": float(f1)}
    return result


def _average_ranks(scores: np.ndarray) -> np.ndarray:
    """1-indexed ranks, tied scores get the average rank of their group."""
    order = np.argsort(scores, kind="mergesort")
    sorted_scores = scores[order]
    ranks = np.empty(len(scores), dtype=np.float64)

    i = 0
    n = len(scores)
    while i < n:
        j = i
        while j + 1 < n and sorted_scores[j + 1] == sorted_scores[i]:
            j += 1
        avg_rank = (i + 1 + j + 1) / 2.0  # average of ranks i+1..j+1 (1-indexed)
        ranks[order[i : j + 1]] = avg_rank
        i = j + 1
    return ranks


def roc_auc_binary(y_true: np.ndarray, y_score: np.ndarray) -> float:
    """Binary ROC AUC via the Mann-Whitney U / rank-sum formula.

    Equivalent to the area under the ROC curve without a full threshold
    sweep. Returns NaN when a class has no positive or no negative
    examples in this batch (AUC is undefined there).
    """
    positive = y_true == 1
    n_pos = int(positive.sum())
    n_neg = int((~positive).sum())
    if n_pos == 0 or n_neg == 0:
        return float("nan")

    ranks = _average_ranks(y_score)
    sum_ranks_pos = ranks[positive].sum()
    return float((sum_ranks_pos - n_pos * (n_pos + 1) / 2.0) / (n_pos * n_neg))


def roc_auc_per_class(y_true: np.ndarray, y_prob: np.ndarray, num_classes: int) -> dict[int, float]:
    """One-vs-rest ROC AUC for each class, from full softmax probability vectors."""
    return {c: roc_auc_binary((y_true == c).astype(int), y_prob[:, c]) for c in range(num_classes)}


def build_report(
    y_true: np.ndarray, y_pred: np.ndarray, class_names: list[str], y_prob: np.ndarray | None = None
) -> dict:
    cm = confusion_matrix(y_true, y_pred, len(class_names))
    per_class = precision_recall_f1_per_class(cm)

    roc_auc = roc_auc_per_class(y_true, y_prob, len(class_names)) if y_prob is not None else None
    # correct = true positives (diagonal), total = actual images of that class in this dataset
    correct_counts = {c: int(cm[c, c]) for c in range(len(class_names))}
    total_counts = {c: int(cm[c, :].sum()) for c in range(len(class_names))}

    return {
        "accuracy": accuracy(cm),
        "confusion_matrix": cm.tolist(),
        "class_names": class_names,
        "per_class": {
            class_names[i]: {
                **metrics,
                "correct": correct_counts[i],
                "total": total_counts[i],
                **({"roc_auc": roc_auc[i]} if roc_auc is not None else {}),
            }
            for i, metrics in per_class.items()
        },
    }
