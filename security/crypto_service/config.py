"""Configuration helpers for the local crypto service."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CryptoServiceConfig:
    """Resolved runtime settings for the local crypto service."""

    host: str
    port: int
    token: str
    master_key_file: str
    env_var_name: str


def load_config() -> CryptoServiceConfig:
    """Load service configuration from environment variables."""
    token = os.environ.get('CRYPTO_SERVICE_TOKEN', '')
    if not token:
        raise RuntimeError('CRYPTO_SERVICE_TOKEN is required')

    default_key_file = Path.cwd() / 'security' / '.local' / 'master_key.json'
    return CryptoServiceConfig(
        host=os.environ.get('CRYPTO_SERVICE_HOST', '127.0.0.1'),
        port=int(os.environ.get('CRYPTO_SERVICE_PORT', '5050')),
        token=token,
        master_key_file=os.environ.get('LOCAL_MASTER_KEY_FILE', str(default_key_file)),
        env_var_name=os.environ.get('LOCAL_KMS_PASSPHRASE_ENV_VAR', 'LISTER_LOCAL_KMS_PASSPHRASE'),
    )
