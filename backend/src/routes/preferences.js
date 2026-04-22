// backend/src/routes/preferences.js
const express         = require('express')
const router          = express.Router()
const UserPreference  = require('../models/UserPreference')
const {
  DEFAULT_ITEM_SORT_MODE,
  DEFAULT_SHOW_PINNED_ONLY,
  DEFAULT_SHOW_PUBLIC,
  ITEM_SORT_MODES
} = require('../config/constants')
const { authenticate } = require('../middlewares/auth')
const { asyncHandler, createHttpError } = require('../utils/http')
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
    pref = await UserPreference.create({
      uid,
      showPublic: DEFAULT_SHOW_PUBLIC,
      showPinnedOnly: DEFAULT_SHOW_PINNED_ONLY,
      itemSortMode: DEFAULT_ITEM_SORT_MODE,
      pinnedListIds: [],
      pinnedListOrder: []
    })
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
  const updates = {}

  if (req.body.showPublic !== undefined) {
    updates.showPublic = requireBoolean(
      req.body.showPublic,
      'showPublic must be a boolean'
    )
  }

  if (req.body.showPinnedOnly !== undefined) {
    updates.showPinnedOnly = requireBoolean(
      req.body.showPinnedOnly,
      'showPinnedOnly must be a boolean'
    )
  }

  if (req.body.itemSortMode !== undefined) {
    if (!ITEM_SORT_MODES.includes(req.body.itemSortMode)) {
      throw createHttpError(400, 'itemSortMode is invalid')
    }
    updates.itemSortMode = req.body.itemSortMode
  }

  if (req.body.pinnedListIds !== undefined) {
    if (!Array.isArray(req.body.pinnedListIds)) {
      throw createHttpError(400, 'pinnedListIds must be an array')
    }
    updates.pinnedListIds = Array.from(
      new Set(
        req.body.pinnedListIds
          .filter(id => typeof id === 'string')
          .map(id => id.trim())
          .filter(Boolean)
      )
    )
  }

  if (req.body.pinnedListOrder !== undefined) {
    if (!Array.isArray(req.body.pinnedListOrder)) {
      throw createHttpError(400, 'pinnedListOrder must be an array')
    }
    updates.pinnedListOrder = Array.from(
      new Set(
        req.body.pinnedListOrder
          .filter(id => typeof id === 'string')
          .map(id => id.trim())
          .filter(Boolean)
      )
    )
  }

  const pref = await UserPreference.findOneAndUpdate(
    { uid },
    updates,
    { upsert: true, new: true }
  )
  return res.json(pref)
}))

module.exports = router
