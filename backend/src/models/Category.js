// backend/src/models/Category.js
const mongoose = require('mongoose')

const CategorySchema = new mongoose.Schema({
  name:          { type: String, required: true, unique: true, trim: true },
  ownerUid:      { type: String, required: true, trim: true },
  isPublic:      { type: Boolean, default: true },
  subCategories: {
    type: [{ type: String, trim: true }],
    default: []
  }
}, { timestamps: true })

CategorySchema.index({ isPublic: 1, name: 1 })
CategorySchema.index({ ownerUid: 1 })

module.exports = mongoose.model('Category', CategorySchema)
