const {
  ALLOW_INSECURE_INTERNAL_CRYPTO_SERVICE,
  CRYPTO_SERVICE_TIMEOUT_MS,
  CRYPTO_SERVICE_TOKEN,
  CRYPTO_SERVICE_URL,
  PRIVATE_LIST_ENCRYPTION_REQUIRED
} = require('../config/env');
const { createHttpError } = require('../utils/http');

function parseCryptoServiceUrl() {
  if (!CRYPTO_SERVICE_URL) {
    return null;
  }

  try {
    return new URL(CRYPTO_SERVICE_URL);
  } catch (error) {
    throw createHttpError(500, 'Crypto service URL is invalid');
  }
}

function isLocalCryptoService(url) {
  return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
}

function assertCryptoConfig({ required = PRIVATE_LIST_ENCRYPTION_REQUIRED } = {}) {
  const hasUrl = Boolean(CRYPTO_SERVICE_URL);
  const hasToken = Boolean(CRYPTO_SERVICE_TOKEN);

  if (!hasUrl && !hasToken) {
    if (required) {
      throw createHttpError(
        500,
        'Private-list encryption is not configured on the backend'
      );
    }
    return null;
  }

  if (!hasUrl || !hasToken) {
    throw createHttpError(500, 'Crypto service configuration is incomplete');
  }

  const url = parseCryptoServiceUrl();
  if (url.protocol !== 'https:' && !isLocalCryptoService(url) && !ALLOW_INSECURE_INTERNAL_CRYPTO_SERVICE) {
    throw createHttpError(
      500,
      'Crypto service must use HTTPS outside trusted local development'
    );
  }

  return url;
}

async function sendCryptoRequest(path, body) {
  const url = assertCryptoConfig({ required: true });

  let response;
  try {
    response = await fetch(`${url.toString().replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-service-token': CRYPTO_SERVICE_TOKEN
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CRYPTO_SERVICE_TIMEOUT_MS)
    });
  } catch (error) {
    if (error?.name === 'TimeoutError') {
      throw createHttpError(500, 'Crypto service request timed out');
    }
    throw createHttpError(500, 'Unable to reach the crypto service');
  }

  let parsed;
  try {
    parsed = await response.json();
  } catch (error) {
    throw createHttpError(500, 'Crypto service returned an invalid response');
  }

  if (!response.ok) {
    const status = response.status === 400 ? 400 : 500;
    throw createHttpError(status, parsed?.error || 'Crypto service request failed');
  }

  return parsed;
}

function decodeBase64ToUtf8(value) {
  return Buffer.from(value, 'base64').toString('utf8');
}

function encodeUtf8ToBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64');
}

async function encryptString(plaintext, context) {
  const response = await sendCryptoRequest('/v1/encrypt', {
    plaintext_b64: encodeUtf8ToBase64(plaintext),
    context
  });
  return response.payload;
}

async function decryptString(payload, context) {
  const response = await sendCryptoRequest('/v1/decrypt', {
    payload,
    context
  });
  return decodeBase64ToUtf8(response.plaintext_b64);
}

module.exports = {
  assertCryptoConfig,
  decryptString,
  encryptString
};
