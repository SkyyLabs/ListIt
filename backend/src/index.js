// backend/src/index.js
require('dotenv').config();
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const { createApp } = require('./app');
const {
  DEFAULT_PUBLIC_CATEGORIES
} = require('./config/constants');
const {
  PORT,
  CORS_ORIGIN,
  MONGO_URI,
  ADMIN_UID,
  FIREBASE_SERVICE_ACCOUNT_KEY
} = require('./config/env');
const { assertCryptoConfig } = require('./services/cryptoService');

// import your Category model
const Category = require('./models/Category');

const app = createApp();

// Initialize Firebase Admin with service account from environment variable
if (!FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is required');
}

assertCryptoConfig();

admin.initializeApp({
  credential: admin.credential.cert(FIREBASE_SERVICE_ACCOUNT_KEY)
});

// connect to MongoDB
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(async () => {
    console.log('✅ MongoDB connected');
    await seedDefaultCategories();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// seed function
async function seedDefaultCategories() {
  for (const name of DEFAULT_PUBLIC_CATEGORIES) {
    await Category.updateOne(
      { name, isPublic: true },
      {
        $setOnInsert: {
          name,
          ownerUid: ADMIN_UID,
          isPublic: true
        }
      },
      { upsert: true }
    );
  }
  console.log('🌱 Default categories seeded');
}

app.listen(PORT, () => console.log(`🚀 Backend listening on port ${PORT}`));
