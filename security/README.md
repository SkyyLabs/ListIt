# Local KMS for Development

This directory contains a development-only envelope-encryption subsystem for `Lister`.

## What it does

- encrypts payloads with a random data key per operation
- wraps each data key with a local master key
- stores the local master key encrypted on disk
- exposes a small internal HTTP service the Node backend can call

## Security boundary

This is not end-to-end encryption and it is not a production KMS/HSM.

- The backend remains in the trust path.
- The local master key is protected for development convenience, not cloud-grade custody.
- Do not market this as zero-knowledge or admin-proof encryption.

## Production changes required

Before treating this as production-grade, replace `LocalKeyManager` with a cloud-backed implementation such as `AwsKmsKeyManager` or `GcpKmsKeyManager`, then:

- move master-key custody to AWS KMS / Google Cloud KMS / HSM
- use IAM roles or service accounts instead of local passphrase unlocking
- enable audit logging
- enable key rotation
- define break-glass access procedures

## Environment variables

- `CRYPTO_SERVICE_TOKEN`: shared secret between the Node backend and Python crypto service
- `LISTER_LOCAL_KMS_PASSPHRASE`: passphrase used to unlock the encrypted local master key
- `LOCAL_MASTER_KEY_FILE`: optional path override for the encrypted local master key file
- `CRYPTO_SERVICE_HOST`: optional host for the crypto service, defaults to `127.0.0.1`
- `CRYPTO_SERVICE_PORT`: optional port for the crypto service, defaults to `5050`

## Running locally

Create a Python environment, install dependencies, and start the service:

```bash
cd security
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export CRYPTO_SERVICE_TOKEN=dev-internal-token
export LISTER_LOCAL_KMS_PASSPHRASE=dev-passphrase
python3 -m security.crypto_service.app
```

Run the example:

```bash
python3 -m security.examples.basic_usage
```
