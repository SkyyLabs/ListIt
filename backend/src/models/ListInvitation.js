const mongoose = require('mongoose');
const { COLLABORATOR_PERMISSIONS } = require('../config/constants');

const ListInvitationSchema = new mongoose.Schema({
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  permissions: {
    type: [{ type: String, enum: Object.values(COLLABORATOR_PERMISSIONS) }],
    default: [COLLABORATOR_PERMISSIONS.READ]
  },
  invitedByUid: {
    type: String,
    required: true,
    trim: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  acceptedByUid: {
    type: String,
    trim: true,
    default: null
  },
  acceptedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

ListInvitationSchema.index({ listId: 1, email: 1, status: 1 });
ListInvitationSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('ListInvitation', ListInvitationSchema);
