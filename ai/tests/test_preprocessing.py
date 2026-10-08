"""Verify image formats and the pixel contract used by inference."""

import io
import sys
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.preprocessing import prepare_model_input, preprocess_image


class PreprocessingTests(unittest.TestCase):
    def test_non_square_image_has_rgb_float32_batch_without_double_scaling(self):
        buffer = io.BytesIO()
        Image.new("RGB", (640, 320), (255, 128, 0)).save(buffer, format="PNG")
        batch = prepare_model_input(buffer.getvalue())
        self.assertEqual(batch.shape, (1, 224, 224, 3))
        self.assertEqual(batch.dtype, np.float32)
        np.testing.assert_array_equal(batch[0, 0, 0], [255, 128, 0])

    def test_grayscale_and_rgba_always_have_three_channels(self):
        for mode, color in [("L", 128), ("RGBA", (255, 128, 0, 100))]:
            with self.subTest(mode=mode):
                pixels = preprocess_image(Image.new(mode, (80, 300), color))
                self.assertEqual(pixels.shape, (224, 224, 3))
                self.assertEqual(pixels.dtype, np.float32)
                self.assertTrue(np.all((pixels >= 0) & (pixels <= 255)))

    def test_corrupt_upload_is_rejected(self):
        with self.assertRaises(ValueError):
            prepare_model_input(b"not an image")


if __name__ == "__main__":
    unittest.main()
