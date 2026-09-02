"""Training entry point — docs/AI_MODEL.md#ai-pipeline.

    Raw Dataset -> Preprocessing -> Augmentation -> Train/Val/Test Split
    -> MobileNetV2 Transfer Learning -> Fine-tuning -> Evaluation
    -> Export Model

Usage (from the ai/ directory, with .venv active):
    python src/train.py

Requires images under data/raw/<CLASS_NAME>/ first (see config.py's
docstring) — dataset source/size is still DECISION REQUIRED per
docs/AI_MODEL.md#dataset, so this only runs meaningfully once real
palm-leaf images are supplied.
"""

import argparse
import json
import sys
from pathlib import Path

import keras

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config  # noqa: E402
from src import dataset, evaluate, export_model, report, model as model_lib  # noqa: E402


def train(
    head_epochs: int = config.HEAD_EPOCHS,
    fine_tune_epochs: int = config.FINE_TUNE_EPOCHS,
    skip_split: bool = False,
) -> Path:
    if not skip_split:
        counts = dataset.split_dataset()
        print(f"Split dataset: {counts}")

    train_ds, val_ds, test_ds = dataset.build_datasets()

    model, base_model = model_lib.build_model()

    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=config.EARLY_STOPPING_PATIENCE, restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2),
    ]

    # --- Phase 1: Transfer Learning (frozen base) ---
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=config.HEAD_LEARNING_RATE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    history_head = model.fit(train_ds, validation_data=val_ds, epochs=head_epochs, callbacks=callbacks)

    # --- Phase 2: Fine-tuning (unfreeze top layers, low LR) ---
    model_lib.unfreeze_top_layers(base_model, config.FINE_TUNE_UNFREEZE_LAYERS)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=config.FINE_TUNE_LEARNING_RATE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    history_fine_tune = model.fit(
        train_ds, validation_data=val_ds, epochs=fine_tune_epochs, callbacks=callbacks
    )

    # --- Evaluation on the held-out test split (never used above) ---
    test_report = evaluate.evaluate_dataset(model, test_ds)
    print(f"Test accuracy: {test_report['accuracy']:.4f}")

    config.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    with open(config.MODELS_DIR / f"evaluation-{config.MODEL_VERSION}.json", "w", encoding="utf-8") as f:
        json.dump(test_report, f, ensure_ascii=False, indent=2)

    report.save_class_names(
        config.CLASS_NAMES, config.MODELS_DIR / f"class_names-{config.MODEL_VERSION}.json"
    )
    report.save_confusion_matrix_plot(
        test_report["confusion_matrix"],
        test_report["class_names"],
        config.MODELS_DIR / f"confusion_matrix-{config.MODEL_VERSION}.png",
    )
    report.save_classification_report_txt(
        test_report, config.MODELS_DIR / f"classification_report-{config.MODEL_VERSION}.txt"
    )

    history = {
        "head": {k: [float(v) for v in vs] for k, vs in history_head.history.items()},
        "fine_tune": {k: [float(v) for v in vs] for k, vs in history_fine_tune.history.items()},
    }
    with open(config.MODELS_DIR / f"history-{config.MODEL_VERSION}.json", "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

    model_path = export_model.export_model(model)
    print(f"Exported model to {model_path}")
    return model_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the PalmGuard AI MobileNetV2 model.")
    parser.add_argument("--head-epochs", type=int, default=config.HEAD_EPOCHS)
    parser.add_argument("--fine-tune-epochs", type=int, default=config.FINE_TUNE_EPOCHS)
    parser.add_argument(
        "--skip-split", action="store_true", help="Reuse an existing data/splits/ instead of regenerating it."
    )
    args = parser.parse_args()
    train(head_epochs=args.head_epochs, fine_tune_epochs=args.fine_tune_epochs, skip_split=args.skip_split)
