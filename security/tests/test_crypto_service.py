from __future__ import annotations

import base64
import http.client
import json
import os
import tempfile
import threading
import time
import unittest
from pathlib import Path
from socketserver import TCPServer

from security.crypto_service.app import create_handler
from security.crypto_service.config import CryptoServiceConfig
from security.local_kms.local_key_manager import LocalKeyManager


class CryptoServiceTests(unittest.TestCase):
    def test_encrypt_and_decrypt_endpoints(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            os.environ['LISTER_LOCAL_KMS_PASSPHRASE'] = 'service-passphrase'
            config = CryptoServiceConfig(
                host='127.0.0.1',
                port=0,
                token='test-token',
                master_key_file=str(Path(tmpdir) / 'master_key.json'),
                env_var_name='LISTER_LOCAL_KMS_PASSPHRASE',
            )
            key_manager = LocalKeyManager(config.master_key_file, env_var_name=config.env_var_name)
            server = TCPServer((config.host, 0), create_handler(config, key_manager))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            time.sleep(0.05)

            try:
                connection = http.client.HTTPConnection(config.host, server.server_address[1])
                plaintext_b64 = base64.b64encode(b'secret-value').decode('ascii')
                body = json.dumps({'plaintext_b64': plaintext_b64}).encode('utf-8')
                connection.request(
                    'POST',
                    '/v1/encrypt',
                    body=body,
                    headers={
                        'Content-Type': 'application/json',
                        'Content-Length': str(len(body)),
                        'X-Internal-Service-Token': config.token,
                    },
                )
                encrypt_response = connection.getresponse()
                self.assertEqual(encrypt_response.status, 200)
                encrypted_payload = json.loads(encrypt_response.read().decode('utf-8'))['payload']

                decrypt_body = json.dumps({'payload': encrypted_payload}).encode('utf-8')
                connection.request(
                    'POST',
                    '/v1/decrypt',
                    body=decrypt_body,
                    headers={
                        'Content-Type': 'application/json',
                        'Content-Length': str(len(decrypt_body)),
                        'X-Internal-Service-Token': config.token,
                    },
                )
                decrypt_response = connection.getresponse()
                self.assertEqual(decrypt_response.status, 200)
                decrypted_payload = json.loads(decrypt_response.read().decode('utf-8'))
                self.assertEqual(
                    base64.b64decode(decrypted_payload['plaintext_b64'].encode('ascii')),
                    b'secret-value',
                )
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=1)

    def test_missing_token_is_unauthorized(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            os.environ['LISTER_LOCAL_KMS_PASSPHRASE'] = 'service-passphrase'
            config = CryptoServiceConfig(
                host='127.0.0.1',
                port=0,
                token='test-token',
                master_key_file=str(Path(tmpdir) / 'master_key.json'),
                env_var_name='LISTER_LOCAL_KMS_PASSPHRASE',
            )
            key_manager = LocalKeyManager(config.master_key_file, env_var_name=config.env_var_name)
            server = TCPServer((config.host, 0), create_handler(config, key_manager))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            time.sleep(0.05)

            try:
                connection = http.client.HTTPConnection(config.host, server.server_address[1])
                connection.request('POST', '/v1/encrypt', body=b'{}', headers={'Content-Length': '2'})
                response = connection.getresponse()
                self.assertEqual(response.status, 401)
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=1)


if __name__ == '__main__':
    unittest.main()
