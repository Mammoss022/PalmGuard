"""Data cleaning / QA checks — docs/AI_MODEL.md's "Data Cleaning" pipeline stage.

Automates what's mechanically checkable from the checklist:
    [x] รูปเปิดได้ (image opens)              -> corrupt file check
    [x] ไม่มีไฟล์เสีย (no corrupt files)         -> corrupt file check
    [ ] Label ถูกต้อง (correct label)           -> only file *placement* is checkable
                                                  here; whether the content actually
                                                  matches its class folder needs a human
                                                  (or a trained model) to judge.
    [x] ไม่มีรูปซ้ำ (no duplicates)              -> average-hash (aHash) grouping
    [x] ไม่มีภาพเบลอเกินไป (not too blurry)      -> variance-of-Laplacian sharpness
    [ ] ไม่มีภาพที่ไม่เกี่ยวข้อง (no irrelevant images) -> needs human/model judgment,
                                                  not mechanically checkable from pixels
                                                  alone (that's what the NON_PALM class
                                                  is for once the model is trained)
    [x] จำนวนแต่ละ class ไม่ต่างกันมากเกินไป      -> per-class count balance check

Run as a script from ai/: `python -m src.data_cleaning`
Deliberately does not import src/dataset.py (which pulls in TensorFlow) —
this only needs OpenCV/PIL/numpy, so it stays fast to run on a raw dataset
before any training code is touched.
"""

import sys
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config  # noqa: E402

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

BLUR_THRESHOLD = 100.0  # variance of Laplacian below this = too blurry (starting point, not tuned)
MAX_CLASS_IMBALANCE_RATIO = 1.5  # largest class shouldn't outnumber the smallest by more than this


@dataclass
class ClassReport:
    class_name: str
    image_count: int = 0
    corrupt_files: list[str] = field(default_factory=list)
    blurry_files: list[str] = field(default_factory=list)
    duplicate_groups: list[list[str]] = field(default_factory=list)


def _ahash(image: Image.Image, hash_size: int = 8) -> int:
    """Average hash — cheap near-duplicate fingerprint, no extra dependency."""
    small = image.convert("L").resize((hash_size, hash_size), Image.LANCZOS)
    pixels = np.asarray(small, dtype=np.float32)
    bits = pixels > pixels.mean()
    value = 0
    for bit in bits.flatten():
        value = (value << 1) | int(bit)
    return value


def _sharpness(gray: np.ndarray) -> float:
    """Variance of the Laplacian — higher means sharper/more in-focus."""
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def check_class(class_dir: Path) -> ClassReport:
    report = ClassReport(class_name=class_dir.name)
    hashes: dict[int, list[str]] = {}

    files = sorted(f for f in class_dir.glob("*") if f.suffix.lower() in IMAGE_EXTENSIONS)
    for f in files:
        try:
            with Image.open(f) as img:
                img.load()
                rgb = img.convert("RGB")
        except Exception:
            report.corrupt_files.append(f.name)
            continue

        report.image_count += 1

        gray = cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2GRAY)
        if _sharpness(gray) < BLUR_THRESHOLD:
            report.blurry_files.append(f.name)

        hashes.setdefault(_ahash(rgb), []).append(f.name)

    report.duplicate_groups = [names for names in hashes.values() if len(names) > 1]
    return report


def validate_dataset(raw_dir: Path = config.RAW_DATA_DIR) -> dict[str, ClassReport]:
    return {
        class_name: check_class(raw_dir / class_name)
        for class_name in config.CLASS_NAMES
        if (raw_dir / class_name).exists()
    }


def check_class_balance(reports: dict[str, ClassReport]) -> list[str]:
    """Returns human-readable warnings if class counts differ too much (empty = balanced)."""
    counts = {name: r.image_count for name, r in reports.items() if r.image_count > 0}
    if len(counts) < 2:
        return []
    largest, smallest = max(counts.values()), min(counts.values())
    if largest / smallest > MAX_CLASS_IMBALANCE_RATIO:
        ordered = sorted(counts.items(), key=lambda kv: kv[1])
        return [f"{name}: {count} ภาพ" for name, count in ordered]
    return []


if __name__ == "__main__":
    reports = validate_dataset()

    print(f"{'Class':<15}{'Images':>8}{'Corrupt':>9}{'Blurry':>8}{'Dup groups':>12}")
    for name, r in reports.items():
        print(f"{name:<15}{r.image_count:>8}{len(r.corrupt_files):>9}{len(r.blurry_files):>8}{len(r.duplicate_groups):>12}")

    for name, r in reports.items():
        if r.corrupt_files:
            print(f"\n[{name}] ไฟล์เสีย/เปิดไม่ได้:")
            for fname in r.corrupt_files:
                print(" -", fname)
        if r.blurry_files:
            print(f"\n[{name}] ภาพเบลอเกินไป (sharpness < {BLUR_THRESHOLD}):")
            for fname in r.blurry_files:
                print(" -", fname)
        if r.duplicate_groups:
            print(f"\n[{name}] พบภาพซ้ำ/คล้ายกันมาก:")
            for group in r.duplicate_groups:
                print(" -", ", ".join(group))

    imbalance = check_class_balance(reports)
    if imbalance:
        print(f"\n⚠ Class ไม่สมดุลกันเกิน {MAX_CLASS_IMBALANCE_RATIO}x:")
        for line in imbalance:
            print(" -", line)
