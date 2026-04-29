"""Authentication helpers for the internal crypto service."""

from __future__ import annotations

from .config import CryptoServiceConfig

AUTH_HEADER = 'X-Internal-Service-Token'


def is_authorized(headers, config: CryptoServiceConfig) -> bool:
    """Return whether the request carries the expected internal service token."""
    return headers.get(AUTH_HEADER) == config.token
