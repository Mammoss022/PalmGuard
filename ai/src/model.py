"""MobileNetV2 transfer-learning model — docs/AI_MODEL.md#mobilenetv2 /
#transfer-learning / #fine-tuning.
"""

import sys
from pathlib import Path

import keras
from keras import layers

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config  # noqa: E402


def build_model(img_size: tuple[int, int] = config.IMG_SIZE, num_classes: int = config.NUM_CLASSES):
    """Builds MobileNetV2 + a new classification head.

    The base is frozen (`trainable = False`) for the transfer-learning
    phase; call `base_model.trainable = True` (and unfreeze selectively)
    for the fine-tuning phase — see src/train.py.
    """
    base_model = keras.applications.MobileNetV2(
        input_shape=(*img_size, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = keras.Input(shape=(*img_size, 3), name="image")
    # Equivalent to keras.applications.mobilenet_v2.preprocess_input's
    # [-1, 1] scaling, but as a plain serializable layer so it survives
    # .keras export/import (see docs/AI_MODEL.md#model-deployment) and keeps
    # the exported model self-contained: callers pass raw [0, 255] pixels.
    x = layers.Rescaling(scale=1.0 / 127.5, offset=-1.0, name="mobilenet_v2_rescaling")(inputs)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D(name="global_average_pooling")(x)
    x = layers.Dense(128, activation="relu", name="head_dense")(x)
    x = layers.Dropout(0.2, name="head_dropout")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = keras.Model(inputs, outputs, name="palmguard_mobilenetv2")
    return model, base_model


def unfreeze_top_layers(base_model: keras.Model, num_layers: int) -> None:
    """Fine-tuning: unfreeze only the top `num_layers` of the base model."""
    base_model.trainable = True
    freeze_until = max(0, len(base_model.layers) - num_layers)
    for layer in base_model.layers[:freeze_until]:
        layer.trainable = False
