const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const CORS_ORIGINS = CORS_ORIGIN
  ? CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : [];
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_UID = process.env.ADMIN_UID;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGIN;
const INVITE_FROM_EMAIL = process.env.INVITE_FROM_EMAIL || 'ListIt <onboarding@resend.dev>';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FIREBASE_SERVICE_ACCOUNT_KEY = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

module.exports = {
  PORT,
  CORS_ORIGIN,
  CORS_ORIGINS,
  FRONTEND_ORIGIN,
  MONGO_URI,
  ADMIN_UID,
  INVITE_FROM_EMAIL,
  RESEND_API_KEY,
  FIREBASE_SERVICE_ACCOUNT_KEY
};
