// backend/src/models/Item.js
const mongoose = require('mongoose');
const { DEFAULT_ITEM_SUBCATEGORY } = require('../config/constants');

const ItemSchema = new mongoose.Schema({
  listId:      { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
  text:        { type: String, required: true, trim: true },
  subCategory: {
    type: String,
    required: true,
    trim: true,
    default: DEFAULT_ITEM_SUBCATEGORY
  }, // default to 'Misc' if not specified
  addedBy:     { type: String, required: true, trim: true },
  // track which users have marked this item done
  doneBy:      {
    type: [{ type: String, trim: true }],
    default: []
  }
}, { timestamps: true });

ItemSchema.index({ listId: 1 });
ItemSchema.index({ listId: 1, addedBy: 1 });

module.exports = mongoose.model('Item', ItemSchema);
