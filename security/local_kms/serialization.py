"""Serialization helpers for encrypted payloads."""

from __future__ import annotations

import base64
import json
from typing import Mapping

from .errors import PayloadSerializationError, PayloadValidationError
from .models import EncryptedPayload

REQUIRED_FIELDS = {
    'version',
    'algorithm',
    'key_wrapping_algorithm',
    'ciphertext_b64',
    'ciphertext_nonce_b64',
    'encrypted_data_key_b64',
    'encrypted_data_key_nonce_b64',
}


def b64encode_bytes(value: bytes) -> str:
    """Encode bytes for JSON storage."""
    return base64.b64encode(value).decode('ascii')


def b64decode_string(value: str) -> bytes:
    """Decode a base64 string and surface stable validation errors."""
    try:
        return base64.b64decode(value.encode('ascii'), validate=True)
    except Exception as exc:
        raise PayloadValidationError('Invalid base64 field in encrypted payload') from exc


def payload_to_dict(payload: EncryptedPayload) -> dict[str, str | None]:
    """Convert a payload object into a JSON-safe dictionary."""
    return payload.to_dict()


def payload_from_dict(data: Mapping[str, object]) -> EncryptedPayload:
    """Validate and parse a payload dictionary."""
    missing_fields = REQUIRED_FIELDS.difference(data.keys())
    if missing_fields:
        raise PayloadValidationError(
            f'Encrypted payload is missing required fields: {sorted(missing_fields)}'
        )

    for field_name in REQUIRED_FIELDS:
        if not isinstance(data[field_name], str) or not data[field_name]:
            raise PayloadValidationError(f'Encrypted payload field "{field_name}" must be a non-empty string')

    context_b64 = data.get('context_b64')
    if context_b64 is not None and not isinstance(context_b64, str):
        raise PayloadValidationError('Encrypted payload field "context_b64" must be a string when provided')

    return EncryptedPayload(
        version=data['version'],
        algorithm=data['algorithm'],
        key_wrapping_algorithm=data['key_wrapping_algorithm'],
        ciphertext_b64=data['ciphertext_b64'],
        ciphertext_nonce_b64=data['ciphertext_nonce_b64'],
        encrypted_data_key_b64=data['encrypted_data_key_b64'],
        encrypted_data_key_nonce_b64=data['encrypted_data_key_nonce_b64'],
        context_b64=context_b64,
    )


def payload_to_json(payload: EncryptedPayload) -> str:
    """Serialize a payload to JSON."""
    try:
        return json.dumps(payload_to_dict(payload), separators=(',', ':'))
    except TypeError as exc:
        raise PayloadSerializationError('Failed to serialize encrypted payload') from exc


def payload_from_json(raw: str) -> EncryptedPayload:
    """Deserialize a payload from JSON."""
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise PayloadSerializationError('Encrypted payload is not valid JSON') from exc

    if not isinstance(parsed, dict):
        raise PayloadValidationError('Encrypted payload JSON must decode to an object')
    return payload_from_dict(parsed)
