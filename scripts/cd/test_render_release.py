"""Offline unit tests for A2-25 provider adapter (no Render API calls)."""
import unittest
from unittest.mock import patch

import render_release as cd


class ValidationTest(unittest.TestCase):
    def test_valid_origin(self):
        self.assertEqual(cd.validate_origin('https://brewlite-api-49rx.onrender.com/', 'API'),
                         'https://brewlite-api-49rx.onrender.com')

    def test_reject_insecure_origin(self):
        for value in ('http://localhost:4000', 'https://user:pwd@example.org',
                      'https://example.org/private', 'https://example.org/?token=x'):
            with self.assertRaises(cd.ReleaseError):
                cd.validate_origin(value, 'API')

    def test_valid_image_digest(self):
        good = 'ghcr.io/ncd426/brewlite-2-api@sha256:' + 'a' * 64
        self.assertEqual(cd.validate_image(good), good)

    def test_reject_tag_only_image(self):
        with self.assertRaises(cd.ReleaseError):
            cd.validate_image('ghcr.io/ncd426/brewlite-2-api:latest')

    def test_service_id(self):
        self.assertEqual(cd.validate_service('srv-abc123'), 'srv-abc123')
        with self.assertRaises(cd.ReleaseError):
            cd.validate_service('https://example.org')

    def test_deploy_confirms_the_exact_image_digest(self):
        image = 'ghcr.io/ncd426/brewlite-2-api@sha256:' + 'a' * 64
        with patch.dict('render_release.os.environ', {'RENDER_API_KEY':'unit-test'}, clear=False), \
             patch('render_release.render_request') as request, \
             patch('render_release.write_evidence') as evidence, \
             patch('render_release.append_summary'):
            request.side_effect = [
                {'id': 'dep-abc123', 'status': 'created'},
                {'id': 'dep-abc123', 'status': 'live', 'image': {'ref': image, 'sha': 'sha256:' + 'a'*64}},
            ]
            cd.deploy('srv-abc123', image, 'api', timeout_seconds=10)
            self.assertEqual(request.call_count, 2)
            evidence.assert_called_once()

    def test_deploy_rejects_wrong_digest_even_if_live(self):
        image = 'ghcr.io/ncd426/brewlite-2-api@sha256:' + 'a' * 64
        wrong = 'ghcr.io/ncd426/brewlite-2-api@sha256:' + 'b' * 64
        with patch.dict('render_release.os.environ', {'RENDER_API_KEY':'unit-test'}, clear=False), \
             patch('render_release.render_request') as request:
            request.side_effect = [
                {'id': 'dep-abc123', 'status': 'created'},
                {'id': 'dep-abc123', 'status': 'live', 'image': {'ref': wrong}},
            ]
            with self.assertRaises(cd.ReleaseError):
                cd.deploy('srv-abc123', image, 'api', timeout_seconds=10)

    def test_probe_checks_products_list(self):
        with patch('render_release.urllib.request.urlopen') as call:
            res = call.return_value.__enter__.return_value
            res.status = 200
            res.headers.get.return_value = 'application/json'
            res.read.return_value = b'[]'
            self.assertEqual(cd.get_probe('https://example.org/products', 'products')['result'], 'PASS')

    def test_probe_rejects_invalid_products(self):
        with patch('render_release.urllib.request.urlopen') as call:
            res = call.return_value.__enter__.return_value
            res.status = 200
            res.headers.get.return_value = 'application/json'
            res.read.return_value = b'{"message":"not products"}'
            with self.assertRaises(cd.ReleaseError):
                cd.get_probe('https://example.org/products', 'products')


if __name__ == '__main__':
    unittest.main()
