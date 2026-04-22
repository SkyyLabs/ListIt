// backend/src/middlewares/auth.js
const admin = require('firebase-admin')
const { createHttpError } = require('../utils/http')

async function authenticate(req, res, next) {
  const h = req.headers.authorization
  if (!h) return next(createHttpError(401, 'Missing auth header'))
  const token = h.split(' ')[1]
  try {
    req.user = await admin.auth().verifyIdToken(token)
    return next()
  } catch {
    return next(createHttpError(401, 'Unauthorized'))
  }
}

// `optionalAuth` keeps public routes usable while still attaching a user when a
// valid Firebase token is present.
async function optionalAuth(req, res, next) {
  const h = req.headers.authorization
  if (h) {
    try {
      req.user = await admin.auth().verifyIdToken(h.split(' ')[1])
    } catch { /* ignore */ }
  }
  next()
}

module.exports = { authenticate, optionalAuth }
