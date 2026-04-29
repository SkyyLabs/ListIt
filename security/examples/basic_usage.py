"""Minimal local KMS usage example for development."""

from __future__ import annotations

from pathlib import Path

from security.local_kms.local_key_manager import LocalKeyManager
from security.local_kms.serialization import payload_from_json, payload_to_json


def main() -> None:
    base_dir = Path(__file__).resolve().parents[1]
    key_file = base_dir / '.local' / 'example_master_key.json'
    payload_file = base_dir / '.local' / 'example_payload.json'

    manager = LocalKeyManager(str(key_file))

    secret_value = 'example-api-key-value'
    encrypted_payload = manager.encrypt(secret_value.encode('utf-8'))
    payload_file.parent.mkdir(parents=True, exist_ok=True)
    payload_file.write_text(payload_to_json(encrypted_payload), encoding='utf-8')

    restored_payload = payload_from_json(payload_file.read_text(encoding='utf-8'))
    decrypted_value = manager.decrypt(restored_payload).decode('utf-8')

    print('Encrypted payload stored on disk.')
    print(f'Restored plaintext length: {len(decrypted_value)}')


if __name__ == '__main__':
    main()
