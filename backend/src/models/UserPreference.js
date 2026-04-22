// backend/src/models/UserPreference.js
const mongoose = require('mongoose')
const { DEFAULT_SHOW_PUBLIC } = require('../config/constants')

const UserPreferenceSchema = new mongoose.Schema({
  uid:        { type: String, required: true, unique: true, trim: true },
  showPublic: { type: Boolean, default: DEFAULT_SHOW_PUBLIC }
})

UserPreferenceSchema.index({ uid: 1 })

module.exports = mongoose.model('UserPreference', UserPreferenceSchema)
