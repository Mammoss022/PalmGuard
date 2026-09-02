"""Data augmentation — docs/AI_MODEL.md#data-augmentation.

Applied only to the training split (src/dataset.py); operates on raw
[0, 255] pixel values, matching what image_dataset_from_directory yields.
"""

import keras
from keras import layers


def build_augmentation():
    return keras.Sequential(
        [
            layers.RandomFlip("horizontal_and_vertical"),
            layers.RandomRotation(0.08),  # small rotation
            layers.RandomZoom(0.1),
            layers.RandomTranslation(height_factor=0.05, width_factor=0.05),  # small translation
            layers.RandomBrightness(0.15, value_range=(0, 255)),
            layers.RandomContrast(0.15),
        ],
        name="augmentation",
    )
