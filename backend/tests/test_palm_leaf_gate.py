import asyncio
import json
import unittest
from unittest.mock import AsyncMock, patch

from app.services import ai_inference, mobilenet_inference


class PalmLeafGateTests(unittest.TestCase):
    def check(self, payload):
        with patch.object(ai_inference, '_call_gemini', new=AsyncMock(return_value=json.dumps(payload))):
            return asyncio.run(ai_inference.is_palm_leaf(b'image'))

    def test_valid_positive_and_negative(self):
        self.assertTrue(self.check({'is_palm_leaf': True, 'confidence': .95}))
        self.assertFalse(self.check({'is_palm_leaf': False, 'confidence': .99}))

    def test_string_false_and_missing_fields_never_pass(self):
        for payload in [{'is_palm_leaf': 'false', 'confidence': .99}, {'confidence': .99},
                        {'is_palm_leaf': True}, {'is_palm_leaf': 1, 'confidence': .99},
                        {'is_palm_leaf': True, 'confidence': True}, []]:
            with self.subTest(payload=payload), self.assertRaises(ai_inference.InferenceError):
                self.check(payload)

    def test_invalid_or_uncertain_confidence_stops_diagnosis(self):
        for confidence in [.2, -1, 2, float('nan'), float('inf'), '0.99']:
            with self.subTest(confidence=confidence), self.assertRaises(ai_inference.InferenceError):
                self.check({'is_palm_leaf': True, 'confidence': confidence})

    def test_service_failure_never_calls_disease_model(self):
        with patch.object(ai_inference, '_call_gemini', new=AsyncMock(side_effect=ai_inference.InferenceError('service unavailable'))), \
             patch.object(mobilenet_inference, 'run_in_threadpool', new=AsyncMock()) as worker:
            with self.assertRaises(ai_inference.InferenceError):
                asyncio.run(mobilenet_inference.run_inference(b'image'))
            worker.assert_not_called()

    def test_schema_is_requested(self):
        with patch.object(ai_inference, '_call_gemini', new=AsyncMock(return_value='{"is_palm_leaf":true,"confidence":0.99}')) as call:
            asyncio.run(ai_inference.is_palm_leaf(b'image'))
            self.assertEqual(call.call_args.kwargs['response_schema'], ai_inference._GATE_SCHEMA)

    def test_json_transport_failure_is_an_inference_error(self):
        import httpx
        response = httpx.Response(200, text='not json', request=httpx.Request('POST','https://example.test'))
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.post.return_value = response
        with patch.object(ai_inference.settings, 'GEMINI_API_KEY', 'test-key'), \
             patch.object(ai_inference.httpx, 'AsyncClient', return_value=client):
            with self.assertRaises(ai_inference.InferenceError):
                asyncio.run(ai_inference._call_gemini('prompt', b'image', 'image/jpeg'))

    def test_transient_error_is_retried_once_with_schema(self):
        import httpx
        request = httpx.Request('POST', 'https://example.test')
        responses = [httpx.Response(503, request=request),
                     httpx.Response(200, request=request, json={'candidates':[{'content':{'parts':[{'text':'{"is_palm_leaf":false,"confidence":0.99}'}]}}]})]
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.post.side_effect = responses
        with patch.object(ai_inference.settings, 'GEMINI_API_KEY', 'test-key'), \
             patch.object(ai_inference.httpx, 'AsyncClient', return_value=client), \
             patch.object(ai_inference.asyncio, 'sleep', new=AsyncMock()):
            self.assertFalse(asyncio.run(ai_inference.is_palm_leaf(b'image')))
            self.assertEqual(client.post.await_count, 2)
            config = client.post.call_args.kwargs['json']['generationConfig']
            self.assertEqual(config['responseMimeType'], 'application/json')
            self.assertEqual(config['responseJsonSchema'], ai_inference._GATE_SCHEMA)


if __name__ == '__main__':
    unittest.main()
