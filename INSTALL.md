# Install and Run

This project has two apps:

- `backend/`: Express + MongoDB + Firebase Admin API
- `frontend/`: React + Vite app

## Requirements

- Node.js 18 or newer
- npm
- MongoDB connection string
- Firebase project with Google Authentication enabled
- Firebase service account JSON for the backend
- Optional: Resend API key and verified sender domain for emails

## 1. Install Dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

## 2. Create Environment Files

Create:

- `backend/.env`
- `frontend/.env`

### Backend Example

```env
PORT=4000
CORS_ORIGIN=http://localhost:5173,https://listitt.com,https://www.listitt.com
FRONTEND_ORIGIN=http://localhost:5173
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
ADMIN_UID=<firebase-user-uid-for-seeded-categories>
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
RESEND_API_KEY=<optional-resend-api-key>
INVITE_FROM_EMAIL=ListIt <invite@your-verified-domain.com>
```

Backend notes:

- `CORS_ORIGIN` is comma-separated.
- `FRONTEND_ORIGIN` is used for invitation links.
- `ADMIN_UID` is only for seeded default categories.
- Runtime admin access uses Firebase custom claims.
- `FIREBASE_SERVICE_ACCOUNT_KEY` must be valid JSON, usually stored as one line.
- `RESEND_API_KEY` can be omitted locally; email sends will be skipped/logged.

### Frontend Example

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

Frontend notes:

- The frontend uses Vite and reads `REACT_APP_` variables through `vite.config.js`.
- `REACT_APP_API_BASE_URL` should point at the backend API.
- `REACT_APP_FIREBASE_MEASUREMENT_ID` is optional.

## 3. Firebase Setup

1. Enable Google sign-in in Firebase Authentication.
2. Add local and production frontend domains to Firebase Authentication authorized domains.
3. Create a Firebase web app and copy its config values into `frontend/.env`.
4. Generate a service account key for the backend.
5. Put the service account JSON into `backend/.env` as `FIREBASE_SERVICE_ACCOUNT_KEY`.

To create a single-line service account value:

```bash
cat serviceAccountKey.json | jq -c .
```

To grant runtime admin access:

```js
await admin.auth().setCustomUserClaims('<uid>', { admin: true });
```

The user must sign out and back in after the claim is set.

## 4. Optional Resend Email Setup

Emails are used for:

- collaboration invitations
- invitation cancellation notices
- collaborator removal notices

For real delivery:

1. Verify your sender domain in Resend.
2. Set `RESEND_API_KEY`.
3. Set `INVITE_FROM_EMAIL`, for example `ListIt <invite@listitt.com>`.
4. Set `FRONTEND_ORIGIN` to your frontend URL.

## 5. Run Locally

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm start
```

Open:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:4000`

## 6. Useful Commands

Backend:

```bash
cd backend
npm run dev
npm start
npm test
```

Frontend:

```bash
cd frontend
npm start
npm run lint
npm test
npm run build
```

## 7. Production Checklist

Frontend on Vercel:

- Deploy the `frontend/` directory.
- Keep `frontend/vercel.json`; it rewrites SPA routes to `index.html`.
- Set `REACT_APP_API_BASE_URL` to the production backend URL.
- Configure custom domains such as `listitt.com` and `www.listitt.com`.

Backend on Render:

- Deploy the `backend/` directory.
- Set all backend environment variables in Render.
- Include production frontend domains in `CORS_ORIGIN`.
- Set `FRONTEND_ORIGIN` to the public frontend URL.

Firebase:

- Add production domains to authorized domains.
- Make sure the backend service account belongs to the same Firebase project.

Resend:

- Verify the sender domain before using a custom `INVITE_FROM_EMAIL`.

## Notes

- `frontend/dist/` and old `frontend/build/` output are generated and should not be committed.
- Public/private list routing is handled by the React app.
- Collaborator edits are staged in the UI and only saved when `Done` is clicked.
