# ListIt

ListIt is a collaborative list app where the list is shared but completion is personal.

Two people can look at the same list, but each person keeps their own checked-off progress. That is the main rule the app is built around.

## What the app does

- Sign in with Google through Firebase Authentication
- Create lists and assign them to categories
- Add items with optional sub-categories
- Invite collaborators by email
- Mark items done without affecting anyone else
- Choose whether public lists should appear in your own view
- Manage categories through an admin-only UI

## Core behavior

The most important product rule is:

- Lists can be shared
- Item completion is not shared

Each item stores a `doneBy` array in MongoDB. The backend converts that into a user-specific `done` flag when it returns items to the frontend. When a user toggles an item, only that user's UID is added to or removed from `doneBy`.

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 18, Axios, Framer Motion, Tailwind CSS, Firebase Web SDK |
| Backend | Node.js, Express, MongoDB, Mongoose, Firebase Admin |
| Auth | Firebase Authentication with Google sign-in |
| Testing | React Testing Library on the frontend, Node built-in test runner on the backend |

## Repository layout

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

Note: the local repository folder may still be named `Lister`, but the app name is **ListIt**.

## Prerequisites

You need:

- Node.js 18 or newer
- npm
- A MongoDB database
- A Firebase project
- Google sign-in enabled in Firebase Authentication
- A Firebase service account key for the backend

## Environment variables

Create a `.env` file in `backend/` and another in `frontend/`.

### `backend/.env`

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
ADMIN_UID=<firebase-user-uid-for-seeded-categories>
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"listit","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

Notes:

- `ADMIN_UID` is used only when seeding the default public categories so those categories have a real owner.
- Runtime admin access is not controlled by `ADMIN_UID`. Runtime admin access uses Firebase custom claims.
- `FIREBASE_SERVICE_ACCOUNT_KEY` must be a single-line JSON string.

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

- `REACT_APP_FIREBASE_MEASUREMENT_ID` is optional.
- If you are not using Analytics, you can leave `REACT_APP_FIREBASE_MEASUREMENT_ID` blank.

## Firebase setup

### 1. Enable Google sign-in

In Firebase Authentication:

- Open your project
- Go to Authentication
- Enable Google as a sign-in provider

### 2. Create a web app

In Firebase project settings:

- Create a web app if you do not already have one
- Copy the Firebase web config values into `frontend/.env`

### 3. Create a service account

In Firebase project settings:

- Go to Service accounts
- Generate a private key
- Convert that JSON into a single line
- Paste it into `backend/.env` as `FIREBASE_SERVICE_ACCOUNT_KEY`

Example:

```bash
cat serviceAccountKey.json | jq -c .
```

### 4. Grant admin access

Runtime admin behavior uses Firebase custom claims. To make a user an admin, set a claim like this from a trusted admin script or Node console that uses Firebase Admin:

```js
await admin.auth().setCustomUserClaims('<uid>', { admin: true });
```

After that, the user must sign out and sign back in to refresh their token.

Admin access currently affects:

- category deletion
- admin category management UI
- admin deletion of public lists
- admin deletion of items where allowed by backend rules

## Installation

Install dependencies in both apps:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Running locally

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

- Frontend: `http://localhost:3000`
- Backend health check: `http://localhost:4000`

On first backend startup, the app seeds a default set of public categories.

## Development commands

### Frontend

```bash
cd frontend
npm start
npm run build
npm run lint
npm test -- --watchAll=false
```

### Backend

```bash
cd backend
npm run dev
npm start
npm test
```

## Authorization model

### Lists

- Public lists are visible to everyone
- Private lists are visible only to the owner and collaborators
- Owners can update their own lists
- Owners can invite and remove collaborators
- Owners can delete their own list only when no one else has added items
- Admins can delete public lists

### Items

- Public-list items are readable by anyone who can view the list
- Private-list items are readable only by allowed users
- Only the owner or collaborators of a list can add items
- Only the owner or collaborators of a list can toggle item completion
- Non-admin users can delete only items they created
- Admins can delete items through the backend admin path

### Categories

- Public categories are readable without authentication
- Authenticated users can create categories
- Owners and admins can rename categories
- Only admins can delete categories

## API overview

All protected routes expect:

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
- `POST /lists/:id/collaborators`
- `DELETE /lists/:id/collaborators/:collabUid`

### Items

- `GET /items/:listId`
- `POST /items`
- `PUT /items/:id`
- `DELETE /items/:id`

### Preferences

- `GET /preferences`
- `PUT /preferences`

## Key frontend files

- `frontend/src/app.js`: app shell
- `frontend/src/contexts/AuthContext.js`: auth state, login/logout, admin claim handling
- `frontend/src/components/ListView.js`: list fetching, filtering, and visibility
- `frontend/src/components/ListDetail.js`: list-level orchestration for item and collaborator actions
- `frontend/src/services/`: frontend API wrappers by domain

## Key backend files

- `backend/src/index.js`: app boot, Mongo connection, Firebase Admin init, category seeding
- `backend/src/middlewares/auth.js`: Firebase token verification
- `backend/src/routes/lists.js`: list endpoints
- `backend/src/routes/items.js`: item endpoints and per-user completion handling
- `backend/src/routes/categories.js`: category endpoints
- `backend/src/routes/preferences.js`: saved user preferences
- `backend/src/services/listService.js`: shared list-domain backend helpers

## Current test coverage

The current automated tests focus on core project rules rather than full UI coverage.

### Frontend tests cover

- admin claim interpretation
- visible-list filtering

### Backend tests cover

- admin role interpretation
- visible-list query construction
- owner-only enforcement helpers

## Known limitations

- The app is reactive within a session, but it is not real-time across multiple clients.
- Category creation is case-insensitive, but category names are not normalized beyond trimming.
- Firebase Analytics is optional and only initializes when supported by the browser environment.

## Suggested next work

- Add route-level integration tests for backend permissions
- Add component tests for collaborator and item mutation flows
- Consider extracting item-route access helpers into a shared backend access module
