const mongoose = require('mongoose');

const CollaboratorSchema = new mongoose.Schema({
  uid: { type: String, required: true, trim: true },
  permissions: {
    type: [{ type: String, trim: true }],
    default: []
  }
}, { _id: false });

const ListSchema = new mongoose.Schema({
  title:         { type: String, required: true, trim: true },
  categoryId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  ownerUid:      { type: String, required: true, trim: true },
  isPublic:      { type: Boolean, default: true },
  collaborators: {
    type: [CollaboratorSchema],
    default: []
  }
}, { timestamps: true });

ListSchema.index({ ownerUid: 1 });
ListSchema.index({ 'collaborators.uid': 1 });
ListSchema.index({ categoryId: 1, isPublic: 1 });
ListSchema.index({ categoryId: 1, ownerUid: 1 });

module.exports = mongoose.model('List', ListSchema);
