from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from security.local_kms.errors import PayloadValidationError
from security.local_kms.local_key_manager import LocalKeyManager


class LocalKeyManagerTests(unittest.TestCase):
    def setUp(self) -> None:
        os.environ['LISTER_LOCAL_KMS_PASSPHRASE'] = 'unit-test-passphrase'

    def test_encrypt_decrypt_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = LocalKeyManager(Path(tmpdir) / 'master_key.json')
            payload = manager.encrypt(b'secret-value', context={'resourceType': 'test'})

            plaintext = manager.decrypt(payload, context={'resourceType': 'test'})
            self.assertEqual(plaintext, b'secret-value')

    def test_context_mismatch_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = LocalKeyManager(Path(tmpdir) / 'master_key.json')
            payload = manager.encrypt(b'secret-value', context={'resourceType': 'test'})

            with self.assertRaises(PayloadValidationError):
                manager.decrypt(payload, context={'resourceType': 'different'})


if __name__ == '__main__':
    unittest.main()
