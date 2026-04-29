"""Custom errors for the local KMS module."""


class KeyManagerError(Exception):
    """Base class for local KMS errors."""


class MasterKeyInitializationError(KeyManagerError):
    """Raised when the encrypted master key cannot be initialized."""


class MasterKeyUnlockError(KeyManagerError):
    """Raised when the encrypted master key cannot be unlocked."""


class PayloadSerializationError(KeyManagerError):
    """Raised when payload serialization or parsing fails."""


class PayloadValidationError(KeyManagerError):
    """Raised when a payload is malformed or unsupported."""


class DecryptionError(KeyManagerError):
    """Raised when authenticated decryption fails."""
