"""Development-only local key manager implementation."""

from __future__ import annotations

from pathlib import Path
from typing import Mapping, Optional

from .crypto import (
    AES_256_GCM,
    KEY_SIZE_BYTES,
    aes_gcm_decrypt,
    aes_gcm_encrypt,
    canonicalize_context,
    generate_random_bytes,
)
from .errors import PayloadValidationError
from .interfaces import KeyManager
from .master_key_store import MasterKeyStore
from .models import EncryptedPayload
from .serialization import b64decode_string, b64encode_bytes


class LocalKeyManager(KeyManager):
    """Envelope encryption using a local encrypted master key."""

    def __init__(
        self,
        key_file_path: str | Path,
        *,
        env_var_name: str = 'LISTER_LOCAL_KMS_PASSPHRASE',
        passphrase_provider=None,
    ) -> None:
        self.master_key_store = MasterKeyStore(
            key_file_path,
            env_var_name=env_var_name,
            passphrase_provider=passphrase_provider,
        )
        self._master_key: bytes | None = None

    def encrypt(
        self,
        plaintext: bytes,
        context: Optional[Mapping[str, str]] = None,
    ) -> EncryptedPayload:
        if not isinstance(plaintext, bytes):
            raise TypeError('plaintext must be bytes')

        master_key = self._get_master_key()
        aad = canonicalize_context(context)
        data_key = generate_random_bytes(KEY_SIZE_BYTES)

        payload_nonce, ciphertext = aes_gcm_encrypt(data_key, plaintext, aad)
        wrapped_key_nonce, encrypted_data_key = aes_gcm_encrypt(master_key, data_key)

        return EncryptedPayload(
            version='v1',
            algorithm=AES_256_GCM,
            key_wrapping_algorithm=AES_256_GCM,
            ciphertext_b64=b64encode_bytes(ciphertext),
            ciphertext_nonce_b64=b64encode_bytes(payload_nonce),
            encrypted_data_key_b64=b64encode_bytes(encrypted_data_key),
            encrypted_data_key_nonce_b64=b64encode_bytes(wrapped_key_nonce),
            context_b64=b64encode_bytes(aad) if aad is not None else None,
        )

    def decrypt(
        self,
        payload: EncryptedPayload,
        context: Optional[Mapping[str, str]] = None,
    ) -> bytes:
        if payload.version != 'v1':
            raise PayloadValidationError(f'Unsupported encrypted payload version: {payload.version}')

        aad = canonicalize_context(context)
        expected_context_b64 = b64encode_bytes(aad) if aad is not None else None
        if expected_context_b64 != payload.context_b64:
            raise PayloadValidationError('Encryption context does not match the stored payload context')

        master_key = self._get_master_key()
        data_key = aes_gcm_decrypt(
            master_key,
            b64decode_string(payload.encrypted_data_key_nonce_b64),
            b64decode_string(payload.encrypted_data_key_b64),
        )
        return aes_gcm_decrypt(
            data_key,
            b64decode_string(payload.ciphertext_nonce_b64),
            b64decode_string(payload.ciphertext_b64),
            aad,
        )

    def _get_master_key(self) -> bytes:
        if self._master_key is None:
            self._master_key = self.master_key_store.load_or_initialize()
        return self._master_key
