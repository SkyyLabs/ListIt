from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

from security.local_kms.errors import MasterKeyUnlockError
from security.local_kms.master_key_store import MasterKeyStore


class MasterKeyStoreTests(unittest.TestCase):
    def test_initializes_and_reopens_master_key(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            os.environ['LISTER_LOCAL_KMS_PASSPHRASE'] = 'dev-passphrase'
            key_file = Path(tmpdir) / 'master_key.json'

            store = MasterKeyStore(key_file)
            first = store.load_or_initialize()
            second = MasterKeyStore(key_file).load_or_initialize()

            self.assertEqual(first, second)
            payload = json.loads(key_file.read_text(encoding='utf-8'))
            self.assertNotIn(first.hex(), key_file.read_text(encoding='utf-8'))
            self.assertEqual(payload['version'], 'v1')

    def test_wrong_passphrase_fails_unlock(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            key_file = Path(tmpdir) / 'master_key.json'
            os.environ['LISTER_LOCAL_KMS_PASSPHRASE'] = 'correct-passphrase'
            MasterKeyStore(key_file).load_or_initialize()

            os.environ['LISTER_LOCAL_KMS_PASSPHRASE'] = 'wrong-passphrase'
            with self.assertRaises(MasterKeyUnlockError):
                MasterKeyStore(key_file).load_or_initialize()


if __name__ == '__main__':
    unittest.main()
