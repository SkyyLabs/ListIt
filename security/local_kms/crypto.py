"""Low-level cryptographic helpers."""

from __future__ import annotations

import json
import os
from typing import Mapping

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

from .errors import DecryptionError

AES_256_GCM = 'AES-256-GCM'
NONCE_SIZE_BYTES = 12
KEY_SIZE_BYTES = 32


def generate_random_bytes(length: int) -> bytes:
    """Generate cryptographically secure random bytes."""
    return os.urandom(length)


def canonicalize_context(context: Mapping[str, str] | None) -> bytes | None:
    """Serialize context deterministically for AAD binding."""
    if context is None:
        return None
    if not isinstance(context, Mapping):
        raise TypeError('context must be a mapping when provided')
    normalized = {
        str(key): str(value)
        for key, value in sorted(context.items(), key=lambda item: str(item[0]))
    }
    return json.dumps(
        normalized,
        separators=(',', ':'),
        sort_keys=True,
        ensure_ascii=True,
    ).encode('utf-8')


def aes_gcm_encrypt(key: bytes, plaintext: bytes, aad: bytes | None = None) -> tuple[bytes, bytes]:
    """Encrypt bytes with AES-256-GCM and return nonce plus ciphertext."""
    nonce = generate_random_bytes(NONCE_SIZE_BYTES)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, aad)
    return nonce, ciphertext


def aes_gcm_decrypt(key: bytes, nonce: bytes, ciphertext: bytes, aad: bytes | None = None) -> bytes:
    """Decrypt bytes with AES-256-GCM and raise a generic failure on auth errors."""
    try:
        return AESGCM(key).decrypt(nonce, ciphertext, aad)
    except Exception as exc:  # pragma: no cover - cryptography exposes InvalidTag via Exception hierarchy
        raise DecryptionError('Decryption failed') from exc


def derive_key_from_passphrase(
    passphrase: str,
    salt: bytes,
    *,
    length: int = KEY_SIZE_BYTES,
    n: int = 2**14,
    r: int = 8,
    p: int = 1,
) -> bytes:
    """Derive a symmetric key from a passphrase using scrypt."""
    if not isinstance(passphrase, str) or not passphrase:
        raise ValueError('A non-empty passphrase is required')
    kdf = Scrypt(salt=salt, length=length, n=n, r=r, p=p)
    return kdf.derive(passphrase.encode('utf-8'))
