// backend/src/models/UserPreference.js
const mongoose = require('mongoose')
const {
  DEFAULT_ITEM_SORT_MODE,
  DEFAULT_SHOW_PINNED_ONLY,
  DEFAULT_SHOW_PUBLIC,
  ITEM_SORT_MODES
} = require('../config/constants')

const UserPreferenceSchema = new mongoose.Schema({
  uid:        { type: String, required: true, unique: true, trim: true },
  showPublic: { type: Boolean, default: DEFAULT_SHOW_PUBLIC },
  showPinnedOnly: { type: Boolean, default: DEFAULT_SHOW_PINNED_ONLY },
  itemSortMode: {
    type: String,
    enum: ITEM_SORT_MODES,
    default: DEFAULT_ITEM_SORT_MODE
  },
  pinnedListIds: {
    type: [{ type: String, trim: true }],
    default: []
  },
  pinnedListOrder: {
    type: [{ type: String, trim: true }],
    default: []
  }
})

UserPreferenceSchema.index({ uid: 1 })

module.exports = mongoose.model('UserPreference', UserPreferenceSchema)
