const mongoose = require('mongoose');

const ListReactionSchema = new mongoose.Schema({
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: true
  },
  uid: {
    type: String,
    required: true,
    trim: true
  },
  reaction: {
    type: String,
    enum: ['like', 'dislike'],
    required: true
  }
}, { timestamps: true });

ListReactionSchema.index({ listId: 1, uid: 1 }, { unique: true });
ListReactionSchema.index({ listId: 1, reaction: 1 });

module.exports = mongoose.model('ListReaction', ListReactionSchema);
