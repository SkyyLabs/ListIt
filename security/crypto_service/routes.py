"""Route handlers for the local crypto service."""

from __future__ import annotations

import base64
import json
from typing import Callable

from security.local_kms.errors import KeyManagerError, PayloadValidationError
from security.local_kms.serialization import payload_from_dict, payload_to_dict


def _decode_plaintext_field(plaintext_b64: str) -> bytes:
    try:
        return base64.b64decode(plaintext_b64.encode('ascii'), validate=True)
    except Exception as exc:
        raise PayloadValidationError('plaintext_b64 must be valid base64') from exc


def _encode_plaintext_field(plaintext: bytes) -> str:
    return base64.b64encode(plaintext).decode('ascii')


def handle_encrypt(body: dict, key_manager) -> tuple[int, dict]:
    """Handle an encrypt request."""
    plaintext_b64 = body.get('plaintext_b64')
    if not isinstance(plaintext_b64, str) or not plaintext_b64:
        raise PayloadValidationError('plaintext_b64 is required')
    context = body.get('context')
    if context is not None and not isinstance(context, dict):
        raise PayloadValidationError('context must be an object when provided')

    payload = key_manager.encrypt(_decode_plaintext_field(plaintext_b64), context=context)
    return 200, {'payload': payload_to_dict(payload)}


def handle_decrypt(body: dict, key_manager) -> tuple[int, dict]:
    """Handle a decrypt request."""
    payload_data = body.get('payload')
    if not isinstance(payload_data, dict):
        raise PayloadValidationError('payload must be an object')
    context = body.get('context')
    if context is not None and not isinstance(context, dict):
        raise PayloadValidationError('context must be an object when provided')

    plaintext = key_manager.decrypt(payload_from_dict(payload_data), context=context)
    return 200, {'plaintext_b64': _encode_plaintext_field(plaintext)}


def handle_json_request(
    body_bytes: bytes,
    *,
    action: Callable[[dict], tuple[int, dict]],
) -> tuple[int, bytes]:
    """Parse JSON and return a JSON response."""
    try:
        body = json.loads(body_bytes.decode('utf-8') or '{}')
        if not isinstance(body, dict):
            raise PayloadValidationError('JSON request body must be an object')
        status_code, response_body = action(body)
    except PayloadValidationError as exc:
        status_code = 400
        response_body = {'error': str(exc)}
    except KeyManagerError as exc:
        status_code = 500
        response_body = {'error': str(exc)}
    except Exception:
        status_code = 500
        response_body = {'error': 'Internal crypto service error'}

    return status_code, json.dumps(response_body, separators=(',', ':')).encode('utf-8')
