# ListIt

ListIt is a collaborative list app where lists can be shared, but item completion stays personal to each user.

The key product rule is simple: two people can work from the same list, but checking an item off only updates that person's progress.

## Features

- Google sign-in with Firebase Authentication
- Landing page, authenticated Home view, and public Discover view
- Public and private lists
- Categories and optional item sub-categories
- Per-user item completion through each item's `doneBy` list
- Pinned lists, liked/disliked lists, duplicated lists, and ranked public discovery
- Collaborator invitations by email
- Invitation accept flow through `/invites/:token`
- Staged collaborator changes that apply only after clicking `Done`
- Permission levels:
  - `Read Only`
  - `Edit`
  - `Edit All`
- Pending invitation cancellation
- Collaborators can leave a list themselves
- Owner/Edit All users can remove collaborators; owners cannot be removed
- Admin-only category deletion and public-list admin deletion

## Tech Stack

| Layer | Stack |
| --- | --- |
| Frontend | React 18, Vite, Axios, Framer Motion, Tailwind CSS, Firebase Web SDK |
| Backend | Node.js, Express, MongoDB, Mongoose, Firebase Admin |
| Email | Resend HTTP API |
| Testing | Vitest on the frontend, Node built-in test runner on the backend |

## Repository Layout

```text
.
├── backend
│   └── src
│       ├── config
│       ├── middlewares
│       ├── models
│       ├── routes
│       ├── services
│       └── utils
└── frontend
    └── src
        ├── components
        ├── config
        ├── contexts
        ├── services
        └── utils
```

The local repository folder may still be named `Lister`, but the app name is **ListIt**.

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB database
- Firebase project with Google Authentication enabled
- Firebase service account JSON for the backend
- Resend API key and verified sender domain if you want real invitation/notification emails

## Environment Variables

Create `backend/.env` and `frontend/.env`.

### `backend/.env`

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

Notes:

- `CORS_ORIGIN` accepts a comma-separated list of allowed frontend origins.
- `FRONTEND_ORIGIN` is used to build invitation links.
- `ADMIN_UID` is only used when seeding default public categories.
- Runtime admin access uses Firebase custom claims, not `ADMIN_UID`.
- `FIREBASE_SERVICE_ACCOUNT_KEY` must be valid JSON. In hosted environments it is usually safest as a single-line JSON string.
- `RESEND_API_KEY` is optional for local development. Without it, invitation and notification email sends are skipped/logged.
- `INVITE_FROM_EMAIL` must use a sender/domain accepted by Resend for real email delivery.

### `frontend/.env`

```env
REACT_APP_API_BASE_URL=http://localhost:4000
REACT_APP_FIREBASE_API_KEY=<firebase-web-api-key>
REACT_APP_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=<project-id>
REACT_APP_FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
REACT_APP_FIREBASE_APP_ID=<app-id>
REACT_APP_FIREBASE_MEASUREMENT_ID=<optional-analytics-id>
```

Notes:

- The frontend uses Vite but accepts `REACT_APP_` variables through `vite.config.js`.
- `REACT_APP_API_BASE_URL` should point to the backend API. In production this should be the Render backend URL.
- `REACT_APP_FIREBASE_MEASUREMENT_ID` is optional.

## Firebase Setup

1. Enable Google sign-in in Firebase Authentication.
2. Create a Firebase web app and copy its config into `frontend/.env`.
3. Generate a service account private key and provide it as `FIREBASE_SERVICE_ACCOUNT_KEY` in `backend/.env`.
4. Add your local and production domains to Firebase Authentication authorized domains.

To grant runtime admin access, set a Firebase custom claim from a trusted script or Node console:

```js
await admin.auth().setCustomUserClaims('<uid>', { admin: true });
```

The user must sign out and back in to refresh their token.

## Email Setup

ListIt uses Resend for:

- collaboration invitation emails
- pending invitation cancellation emails
- collaborator removal emails

For real delivery:

1. Verify your sending domain in Resend.
2. Set `RESEND_API_KEY` in the backend environment.
3. Set `INVITE_FROM_EMAIL`, for example `ListIt <invite@listitt.com>`.
4. Set `FRONTEND_ORIGIN` to the deployed frontend URL so invitation links point to the right site.

## Installation

Install dependencies in both apps:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Running Locally

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

On backend startup, the app seeds the default public categories when needed.

## Development Commands

Frontend:

```bash
cd frontend
npm start
npm run lint
npm test
npm run build
```

Backend:

```bash
cd backend
npm run dev
npm start
npm test
```

## Routing Behavior

- `/` shows the landing page for logged-out users.
- Logged-in users who directly open `/` are redirected to `/home`.
- Clicking the ListIt logo/title intentionally opens the landing page.
- `/home` shows the signed-in user's owned, collaborating, pinned, and liked lists.
- `/discover` shows public lists. For signed-in users, Discover excludes lists they already own, collaborate on, pinned, or liked.
- Logged-out users can browse public lists on `/discover`.
- `/about`, `/help`, and `/contact` are footer info pages.
- `/invites/:token` handles invitation acceptance.

## Authorization Model

### Lists

- Public lists are visible to everyone.
- Private lists are visible only to the owner and collaborators.
- Owners can update list metadata and public/private status.
- Owners and `Edit All` collaborators can invite collaborators, cancel pending invitations, update collaborator permissions, and remove other collaborators.
- Any collaborator can remove themselves from a list.
- Owners cannot be removed as collaborators.
- Owners can delete their own list only when no one else has added items.
- Admins can delete public lists.

### Collaborator Permissions

- `Read Only`: can view and track personal completion.
- `Edit`: includes read access and item add/remove capability.
- `Edit All`: includes read access, item add/remove capability, item metadata edits, and collaborator management.

Collaborator modal changes are staged locally. Permission changes, removals, self-leave, pending invitation cancellation, and new invitations apply only after clicking `Done`.

### Items

- Users who can view a list can read its items.
- Owners and collaborators can toggle their own item completion.
- Owners, `Edit`, and `Edit All` collaborators can add/remove items.
- Owners and `Edit All` collaborators can edit item text/sub-category metadata.
- Item completion is stored per user in `doneBy`.

### Categories

- Public categories are readable without authentication.
- Authenticated users can create categories.
- Owners and admins can rename categories.
- Only admins can delete categories.

## API Overview

Protected routes expect:

```text
Authorization: Bearer <firebase-id-token>
```

### Health

- `GET /`

### Categories

- `GET /categories`
- `POST /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`

### Lists

- `GET /lists`
- `POST /lists`
- `PUT /lists/:id`
- `DELETE /lists/:id`
- `POST /lists/:id/invitations`
- `DELETE /lists/:id/invitations/:invitationId`
- `POST /lists/:id/collaborators`
- `PUT /lists/:id/collaborators/:collabUid`
- `DELETE /lists/:id/collaborators/:collabUid`
- `PUT /lists/:id/reaction`
- `POST /lists/:id/duplicate`

### Invitations

- `GET /invitations/:token`
- `POST /invitations/:token/accept`

### Items

- `GET /items/:listId`
- `POST /items`
- `PUT /items/:id`
- `PATCH /items/:id`
- `DELETE /items/:id`

### Preferences

- `GET /preferences`
- `PUT /preferences`

## Key Frontend Files

- `frontend/src/app.jsx`: manual SPA routing and app shell.
- `frontend/src/api.js`: Axios instance with Firebase auth token injection.
- `frontend/src/config/env.js`: frontend Firebase and API environment values.
- `frontend/src/contexts/AuthContext.jsx`: auth state, login/logout, admin claim handling.
- `frontend/src/components/ListView.jsx`: list loading, Home/Discover filtering, pinning, and preferences.
- `frontend/src/components/ListDetail.jsx`: list-level item, reaction, duplicate, edit, and collaborator orchestration.
- `frontend/src/components/list-detail/CollaboratorPanel.jsx`: staged collaborator and invitation UI.
- `frontend/src/services/`: small frontend API wrappers by domain.

## Key Backend Files

- `backend/src/index.js`: app boot, Mongo connection, Firebase Admin init, category seeding.
- `backend/src/app.js`: Express app, CORS, route registration.
- `backend/src/middlewares/auth.js`: Firebase token verification.
- `backend/src/routes/lists.js`: list, collaborator, invitation, reaction, and duplicate endpoints.
- `backend/src/routes/items.js`: item endpoints and per-user completion handling.
- `backend/src/routes/invitations.js`: invitation lookup and accept flow.
- `backend/src/routes/preferences.js`: saved user list preferences.
- `backend/src/services/listService.js`: list enrichment, user display data, pending invitations, and ranking stats.
- `backend/src/services/emailService.js`: Resend email helpers.

## Current Test Coverage

Frontend tests cover:

- admin claim interpretation
- visible-list filtering

Backend tests cover:

- item access rules
- collaborator removal and self-leave permissions
- list deletion restrictions
- duplicate-list behavior
- reaction support for legacy collaborators
- visible-list query construction
- admin role interpretation

## Deployment Notes

Frontend:

- Deploy `frontend/` to Vercel.
- `frontend/vercel.json` rewrites all paths to `index.html` so direct links like `/home`, `/discover`, and `/invites/:token` work.
- Set `REACT_APP_API_BASE_URL` to the deployed backend URL.
- Add `listitt.com` and `www.listitt.com` as Vercel domains if using the custom domain.

Backend:

- Deploy `backend/` to Render or another Node host.
- Set backend environment variables in the host dashboard.
- Include the frontend domains in `CORS_ORIGIN`.
- Set `FRONTEND_ORIGIN` to the production frontend URL used in invitation links.

## Known Limitations

- The app is reactive within a session, but it is not real-time across multiple clients.
- Routing is implemented manually in React rather than with `react-router`.
- Firebase Analytics is optional and only initializes when supported by the browser environment.
