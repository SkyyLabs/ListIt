// backend/src/routes/preferences.js
const express         = require('express')
const router          = express.Router()
const UserPreference  = require('../models/UserPreference')
const { DEFAULT_SHOW_PUBLIC } = require('../config/constants')
const { authenticate } = require('../middlewares/auth')
const { asyncHandler } = require('../utils/http')
const { requireBoolean } = require('../utils/validation')

// all routes require a logged-in user
router.use(authenticate)

/**
 * GET /preferences
 * Fetch (or create) this user’s preferences.
 * Response: { uid, showPublic }
 */
router.get('/', asyncHandler(async (req, res) => {
  const uid = req.user.uid
  let pref = await UserPreference.findOne({ uid })
  if (!pref) {
    // default to showing public lists
    pref = await UserPreference.create({ uid, showPublic: DEFAULT_SHOW_PUBLIC })
  }
  return res.json(pref)
}))

/**
 * PUT /preferences
 * Body: { showPublic: Boolean }
 * Response: updated preference
 */
router.put('/', asyncHandler(async (req, res) => {
  const uid = req.user.uid
  const showPublic = requireBoolean(
    req.body.showPublic,
    'showPublic must be a boolean'
  )
  const pref = await UserPreference.findOneAndUpdate(
    { uid },
    { showPublic },
    { upsert: true, new: true }
  )
  return res.json(pref)
}))

module.exports = router
