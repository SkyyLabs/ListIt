# Install and Run

This project has two apps:

- `backend/` for the Express + MongoDB + Firebase Admin API
- `frontend/` for the React app
- `security/` for the development-only Python crypto service used by private-list encryption

## Requirements

- Node.js 18 or newer
- npm
- MongoDB connection string
- Firebase project with Google Authentication enabled
- Firebase service account JSON for the backend

## 1. Install backend dependencies

```bash
cd backend
npm install
```

## 2. Install frontend dependencies

Open another terminal or return to the repo root:

```bash
cd frontend
npm install
```

## 3. Environment files

Create:

- `backend/.env`
- `frontend/.env`

Backend example:

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
ADMIN_UID=<firebase-user-uid-for-seeded-categories>
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
CRYPTO_SERVICE_URL=http://127.0.0.1:5050
CRYPTO_SERVICE_TOKEN=<shared-internal-token>
```

Frontend example:

```env
REACT_APP_API_BASE_URL=http://localhost:4000
REACT_APP_FIREBASE_API_KEY=<firebase-web-api-key>
REACT_APP_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=<project-id>
REACT_APP_FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
REACT_APP_FIREBASE_APP_ID=<app-id>
REACT_APP_FIREBASE_MEASUREMENT_ID=<optional-measurement-id>
```

Crypto service environment:

```env
CRYPTO_SERVICE_TOKEN=<shared-internal-token>
LISTER_LOCAL_KMS_PASSPHRASE=<local-dev-passphrase>
LOCAL_MASTER_KEY_FILE=/absolute/path/to/security/.local/master_key.json
CRYPTO_SERVICE_HOST=127.0.0.1
CRYPTO_SERVICE_PORT=5050
```

## 4. Run the backend

```bash
cd backend
npm run dev
```

## 5. Run the crypto service

```bash
python3 -m venv security/.venv
source security/.venv/bin/activate
pip install -r security/requirements.txt
export CRYPTO_SERVICE_TOKEN=<shared-internal-token>
export LISTER_LOCAL_KMS_PASSPHRASE=<local-dev-passphrase>
python3 -m security.crypto_service.app
```

## 6. Run the frontend

```bash
cd frontend
npm start
```

## 7. Useful commands

Backend tests:

```bash
cd backend
npm test
```

Frontend lint:

```bash
cd frontend
npm run lint
```

Frontend tests:

```bash
cd frontend
npm test -- --watchAll=false
```

Frontend production build:

```bash
cd frontend
npm run build
```

Crypto service tests and validation:

```bash
PYTHONPATH=. python3 -m unittest discover -s security/tests -t .
python3 -m compileall security
```

## Notes

- `frontend/build/` is generated output and should not be committed.
- Runtime admin behavior uses Firebase custom claims, not `ADMIN_UID`.
- `ADMIN_UID` is only used when seeding default public categories.
