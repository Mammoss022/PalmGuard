import asyncio
import sys
import types
import unittest
from unittest.mock import AsyncMock, Mock, patch

from app.core.config import settings
from app.services import mobilenet_inference
from app.services.ai_inference import InferenceError


class MobileNetInferenceTests(unittest.TestCase):
    def test_prediction_uses_backend_confidence_threshold(self):
        fake_predict = Mock(return_value={"class_code": "WHITE_SCALE"})
        module = types.ModuleType("src.predict")
        module.predict = fake_predict
        with patch.dict(sys.modules, {"src.predict": module}), patch.object(mobilenet_inference, "_load_model", return_value=object()), patch.object(settings, "MIN_CONFIDENCE_THRESHOLD", .55):
            mobilenet_inference._predict_sync(b"image")
        self.assertEqual(fake_predict.call_args.kwargs["confidence_threshold"], .55)

    def test_accepted_result_preserves_actual_confidence(self):
        result = {"class_code": "White_Scale", "confidence_score": .5654, "model_version": "test", "class_probabilities": {"WHITE_SCALE": .5654}}
        with patch.object(mobilenet_inference.ai_inference, "is_palm_leaf", new=AsyncMock(return_value=True)), patch.object(mobilenet_inference, "run_in_threadpool", new=AsyncMock(return_value=result)):
            actual = asyncio.run(mobilenet_inference.run_inference(b"image"))
        self.assertEqual(actual.confidence_score, .5654)

    def test_low_confidence_reports_score_and_threshold(self):
        result = {"class_code": "UNKNOWN", "confidence_score": .5398}
        with patch.object(settings, "MIN_CONFIDENCE_THRESHOLD", .55), patch.object(mobilenet_inference.ai_inference, "is_palm_leaf", new=AsyncMock(return_value=True)), patch.object(mobilenet_inference, "run_in_threadpool", new=AsyncMock(return_value=result)):
            with self.assertRaisesRegex(InferenceError, "54.0%.*55%"):
                asyncio.run(mobilenet_inference.run_inference(b"image"))

    def test_non_palm_gate_still_rejects(self):
        with patch.object(mobilenet_inference.ai_inference, "is_palm_leaf", new=AsyncMock(return_value=False)), patch.object(mobilenet_inference, "run_in_threadpool", new=AsyncMock()) as worker:
            with self.assertRaisesRegex(InferenceError, "ไม่พบใบปาล์ม"):
                asyncio.run(mobilenet_inference.run_inference(b"image"))
            worker.assert_not_called()
