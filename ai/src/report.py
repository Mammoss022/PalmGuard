"""Human-readable training artifacts — docs/AI_MODEL.md#evaluation-metrics.

Complements the machine-readable evaluation-{version}.json (already written
by src/train.py) with a plotted confusion matrix, a plain-text classification
report, and the class name order the exported model expects — the three
things a person (or another script) would want without parsing that JSON.
"""

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # headless-safe (Colab/CI/no display) before importing pyplot
import matplotlib.pyplot as plt
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config  # noqa: E402


def save_class_names(class_names: list[str] = config.CLASS_NAMES, output_path: Path = None) -> Path:
    """Writes the class order the model's softmax output indexes into (index i -> class_names[i])."""
    output_path = Path(output_path) if output_path else config.MODELS_DIR / "class_names.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(class_names, f, ensure_ascii=False, indent=2)
    return output_path


def save_confusion_matrix_plot(
    confusion_matrix: list[list[int]] | np.ndarray, class_names: list[str], output_path: Path
) -> Path:
    cm = np.asarray(confusion_matrix)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(5, 5))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(class_names)))
    ax.set_xticklabels(class_names, rotation=45, ha="right")
    ax.set_yticks(range(len(class_names)))
    ax.set_yticklabels(class_names)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("Confusion Matrix")

    # White text on dark cells, dark text on light cells, so it stays legible either way.
    threshold = cm.max() / 2 if cm.size else 0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(
                j, i, int(cm[i, j]), ha="center", va="center",
                color="white" if cm[i, j] > threshold else "black",
            )

    fig.colorbar(im)
    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
    return output_path


def format_classification_report(report: dict) -> str:
    """Plain-text summary, sklearn.metrics.classification_report-style layout."""
    class_names = report["class_names"]
    per_class = report["per_class"]
    name_width = max(len(n) for n in class_names) + 2

    lines = [
        f"{'':<{name_width}}{'precision':>10}{'recall':>10}{'f1-score':>10}{'roc_auc':>10}{'correct/total':>15}",
        "",
    ]
    for name in class_names:
        m = per_class[name]
        roc_auc = m.get("roc_auc")
        roc_auc_str = f"{roc_auc:.3f}" if roc_auc is not None and not np.isnan(roc_auc) else "n/a"
        correct_total_str = f"{m['correct']}/{m['total']}"
        lines.append(
            f"{name:<{name_width}}{m['precision']:>10.3f}{m['recall']:>10.3f}{m['f1']:>10.3f}"
            f"{roc_auc_str:>10}{correct_total_str:>15}"
        )

    lines.append("")
    lines.append(f"{'accuracy':<{name_width}}{'':<10}{'':<10}{report['accuracy']:>10.3f}")
    return "\n".join(lines)


def save_classification_report_txt(report: dict, output_path: Path) -> Path:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(format_classification_report(report), encoding="utf-8")
    return output_path
