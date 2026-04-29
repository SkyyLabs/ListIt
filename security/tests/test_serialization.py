from __future__ import annotations

import unittest

from security.local_kms.errors import PayloadValidationError
from security.local_kms.models import EncryptedPayload
from security.local_kms.serialization import payload_from_dict, payload_from_json, payload_to_json


class SerializationTests(unittest.TestCase):
    def test_payload_json_round_trip(self) -> None:
        payload = EncryptedPayload(
            version='v1',
            algorithm='AES-256-GCM',
            key_wrapping_algorithm='AES-256-GCM',
            ciphertext_b64='YQ==',
            ciphertext_nonce_b64='Yg==',
            encrypted_data_key_b64='Yw==',
            encrypted_data_key_nonce_b64='ZA==',
            context_b64='e30=',
        )

        restored = payload_from_json(payload_to_json(payload))
        self.assertEqual(restored, payload)

    def test_missing_field_fails_validation(self) -> None:
        with self.assertRaises(PayloadValidationError):
            payload_from_dict({'version': 'v1'})


if __name__ == '__main__':
    unittest.main()
