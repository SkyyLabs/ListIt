const mongoose = require('mongoose');

const ListSchema = new mongoose.Schema({
  title:         { type: String, required: true, trim: true },
  categoryId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  ownerUid:      { type: String, required: true, trim: true },
  isPublic:      { type: Boolean, default: true },
  collaborators: {
    type: [{ type: String, trim: true }],
    default: []
  }
}, { timestamps: true });

ListSchema.index({ ownerUid: 1 });
ListSchema.index({ collaborators: 1 });
ListSchema.index({ categoryId: 1, isPublic: 1 });
ListSchema.index({ categoryId: 1, ownerUid: 1 });

module.exports = mongoose.model('List', ListSchema);
