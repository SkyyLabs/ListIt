"""Public interfaces for key management implementations."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Mapping, Optional

from .models import EncryptedPayload


class KeyManager(ABC):
    """Interface for providers that encrypt and decrypt payload bytes."""

    @abstractmethod
    def encrypt(
        self,
        plaintext: bytes,
        context: Optional[Mapping[str, str]] = None,
    ) -> EncryptedPayload:
        """Encrypt a plaintext payload and return a serialized envelope."""

    @abstractmethod
    def decrypt(
        self,
        payload: EncryptedPayload,
        context: Optional[Mapping[str, str]] = None,
    ) -> bytes:
        """Decrypt an encrypted payload and return the original bytes."""
