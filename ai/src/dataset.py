"""Dataset structure, splitting, and tf.data pipelines.

docs/AI_MODEL.md#train--validation--test — stratified split (done
per-class below) into train/val/test; ratios decided as 70/15/15 in
config.py (SPLIT_RATIOS / DATASET_TARGET_SIZE).

Splitting is group-aware, not per-image: multiple photos of the same
source tree must not be scattered across train/val/test, or the model can
partly memorize that specific tree (its bark, background, lighting) and
score artificially well on val/test images of the SAME tree — inflated
accuracy that says nothing about generalizing to a new one. Group key is
derived from the filename convention `<tree_id>_<seq>.<ext>`
(e.g. `tree001_01.jpg`, `tree001_02.jpg` share group "tree001" and are
kept together in one split); a filename with no underscore is treated as
its own singleton group.
"""

import random
import shutil
import sys
from pathlib import Path

import keras
import tensorflow as tf

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config  # noqa: E402
from src.augmentation import build_augmentation  # noqa: E402

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def _group_key(path: Path) -> str:
    """Source-tree id for a filename like `tree001_01.jpg` -> "tree001"."""
    stem = path.stem
    return stem.rsplit("_", 1)[0] if "_" in stem else stem


def split_dataset(
    raw_dir: Path = config.RAW_DATA_DIR,
    splits_dir: Path = config.SPLITS_DIR,
    ratios: dict = config.SPLIT_RATIOS,
    seed: int = config.SPLIT_SEED,
) -> dict[str, int]:
    """Stratified, group-aware copy of raw_dir/<class>/* into splits_dir/{train,val,test}/<class>/*.

    Stratified because the split is computed independently per class
    folder, so each split keeps roughly the same class proportions.
    Group-aware because whole groups (see _group_key) are assigned to a
    single split via a greedy largest-remaining-deficit heuristic, so the
    per-image ratio only approximates `ratios` rather than hitting it
    exactly — the trade-off that avoids leaking a tree across splits.
    """
    rng = random.Random(seed)
    counts: dict[str, int] = {"train": 0, "val": 0, "test": 0}

    for class_name in config.CLASS_NAMES:
        class_dir = raw_dir / class_name
        files = [f for f in class_dir.glob("*") if f.suffix.lower() in IMAGE_EXTENSIONS] if class_dir.exists() else []

        groups: dict[str, list[Path]] = {}
        for f in files:
            groups.setdefault(_group_key(f), []).append(f)

        group_list = list(groups.values())
        rng.shuffle(group_list)

        n = len(files)
        targets = {name: n * ratio for name, ratio in ratios.items()}
        buckets: dict[str, list[Path]] = {"train": [], "val": [], "test": []}
        assigned = {"train": 0, "val": 0, "test": 0}

        for group_files in group_list:
            # Whole group goes to whichever split is furthest behind its target share.
            split_name = min(assigned, key=lambda s: assigned[s] - targets[s])
            buckets[split_name].extend(group_files)
            assigned[split_name] += len(group_files)

        for split_name, split_files in buckets.items():
            out_dir = splits_dir / split_name / class_name
            out_dir.mkdir(parents=True, exist_ok=True)
            for f in split_files:
                shutil.copy2(f, out_dir / f.name)
            counts[split_name] += len(split_files)

    return counts


def _prepare(ds: tf.data.Dataset, augment: bool) -> tf.data.Dataset:
    ds = ds.cache()
    if augment:
        augmentation = build_augmentation()
        ds = ds.map(lambda x, y: (augmentation(x, training=True), y), num_parallel_calls=tf.data.AUTOTUNE)
    return ds.prefetch(tf.data.AUTOTUNE)


def build_datasets(
    splits_dir: Path = config.SPLITS_DIR,
    img_size: tuple[int, int] = config.IMG_SIZE,
    batch_size: int = config.BATCH_SIZE,
) -> tuple[tf.data.Dataset, tf.data.Dataset, tf.data.Dataset]:
    """Returns (train_ds, val_ds, test_ds). Labels are ints indexing CLASS_NAMES.

    Pixels are left as raw [0, 255] floats — MobileNetV2's rescaling is
    baked into the model (src/model.py), not into this pipeline.
    """

    def _load(split: str, shuffle: bool) -> tf.data.Dataset:
        return keras.utils.image_dataset_from_directory(
            splits_dir / split,
            labels="inferred",
            label_mode="int",
            class_names=config.CLASS_NAMES,
            color_mode="rgb",
            image_size=img_size,
            batch_size=batch_size,
            shuffle=shuffle,
            seed=config.SPLIT_SEED,
        )

    train_ds = _prepare(_load("train", shuffle=True), augment=True)
    val_ds = _prepare(_load("val", shuffle=False), augment=False)
    test_ds = _prepare(_load("test", shuffle=False), augment=False)
    return train_ds, val_ds, test_ds
