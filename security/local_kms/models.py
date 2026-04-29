"""Data models for encrypted payload envelopes."""

from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class EncryptedPayload:
    """JSON-safe representation of an envelope-encrypted payload."""

    version: str
    algorithm: str
    key_wrapping_algorithm: str
    ciphertext_b64: str
    ciphertext_nonce_b64: str
    encrypted_data_key_b64: str
    encrypted_data_key_nonce_b64: str
    context_b64: str | None = None

    def to_dict(self) -> dict[str, str | None]:
        """Return a plain dictionary representation."""
        return asdict(self)
