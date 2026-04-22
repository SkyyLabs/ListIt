const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_UID = process.env.ADMIN_UID;
const FIREBASE_SERVICE_ACCOUNT_KEY = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

module.exports = {
  PORT,
  CORS_ORIGIN,
  MONGO_URI,
  ADMIN_UID,
  FIREBASE_SERVICE_ACCOUNT_KEY
};
