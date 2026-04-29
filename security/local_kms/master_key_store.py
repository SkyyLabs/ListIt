"""Encrypted local master-key persistence for development use only."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Callable

from .crypto import (
    AES_256_GCM,
    KEY_SIZE_BYTES,
    aes_gcm_decrypt,
    aes_gcm_encrypt,
    derive_key_from_passphrase,
    generate_random_bytes,
)
from .errors import MasterKeyInitializationError, MasterKeyUnlockError, PayloadSerializationError
from .serialization import b64decode_string, b64encode_bytes

DEFAULT_KDF_N = 2**14
DEFAULT_KDF_R = 8
DEFAULT_KDF_P = 1
DEFAULT_ENV_VAR = 'LISTER_LOCAL_KMS_PASSPHRASE'


class MasterKeyStore:
    """Loads and initializes the encrypted local master key."""

    def __init__(
        self,
        key_file_path: str | Path,
        *,
        env_var_name: str = DEFAULT_ENV_VAR,
        passphrase_provider: Callable[[], str] | None = None,
    ) -> None:
        self.key_file_path = Path(key_file_path)
        self.env_var_name = env_var_name
        self.passphrase_provider = passphrase_provider

    def load_or_initialize(self) -> bytes:
        """Return the decrypted master key, creating it on first use."""
        if not self.key_file_path.exists():
            self._initialize_master_key_file()
        return self._unlock_existing_key()

    def _resolve_passphrase(self) -> str:
        env_value = os.environ.get(self.env_var_name)
        if env_value:
            return env_value
        if self.passphrase_provider:
            passphrase = self.passphrase_provider()
            if passphrase:
                return passphrase
        raise MasterKeyUnlockError(
            f'No unlock secret available. Set {self.env_var_name} or provide a passphrase.'
        )

    def _initialize_master_key_file(self) -> None:
        passphrase = self._resolve_passphrase()
        master_key = generate_random_bytes(KEY_SIZE_BYTES)
        salt = generate_random_bytes(16)
        wrapping_key = derive_key_from_passphrase(
            passphrase,
            salt,
            n=DEFAULT_KDF_N,
            r=DEFAULT_KDF_R,
            p=DEFAULT_KDF_P,
        )
        nonce, encrypted_master_key = aes_gcm_encrypt(wrapping_key, master_key)

        payload = {
            'version': 'v1',
            'kdf': 'scrypt',
            'kdf_salt_b64': b64encode_bytes(salt),
            'kdf_n': DEFAULT_KDF_N,
            'kdf_r': DEFAULT_KDF_R,
            'kdf_p': DEFAULT_KDF_P,
            'wrapping_algorithm': AES_256_GCM,
            'wrapping_nonce_b64': b64encode_bytes(nonce),
            'encrypted_master_key_b64': b64encode_bytes(encrypted_master_key),
        }

        self.key_file_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with self.key_file_path.open('x', encoding='utf-8') as handle:
                json.dump(payload, handle, separators=(',', ':'))
        except FileExistsError:
            return
        except OSError as exc:
            raise MasterKeyInitializationError('Unable to write encrypted master key file') from exc

        try:
            os.chmod(self.key_file_path, 0o600)
        except OSError:
            # Permission enforcement is best-effort across platforms.
            pass

    def _unlock_existing_key(self) -> bytes:
        passphrase = self._resolve_passphrase()
        try:
            raw_data = self.key_file_path.read_text(encoding='utf-8')
            payload = json.loads(raw_data)
        except OSError as exc:
            raise MasterKeyUnlockError('Unable to read encrypted master key file') from exc
        except json.JSONDecodeError as exc:
            raise PayloadSerializationError('Encrypted master key file is not valid JSON') from exc

        try:
            salt = b64decode_string(payload['kdf_salt_b64'])
            nonce = b64decode_string(payload['wrapping_nonce_b64'])
            encrypted_master_key = b64decode_string(payload['encrypted_master_key_b64'])
            wrapping_key = derive_key_from_passphrase(
                passphrase,
                salt,
                n=int(payload.get('kdf_n', DEFAULT_KDF_N)),
                r=int(payload.get('kdf_r', DEFAULT_KDF_R)),
                p=int(payload.get('kdf_p', DEFAULT_KDF_P)),
            )
            return aes_gcm_decrypt(wrapping_key, nonce, encrypted_master_key)
        except KeyError as exc:
            raise MasterKeyUnlockError('Encrypted master key file is missing required fields') from exc
        except ValueError as exc:
            raise MasterKeyUnlockError('Encrypted master key file contains invalid parameters') from exc
        except Exception as exc:
            if isinstance(exc, MasterKeyUnlockError):
                raise
            raise MasterKeyUnlockError('Unable to unlock encrypted master key') from exc
