const crypto = require('node:crypto');
const express = require('express');
const router = express.Router();
const List = require('../models/List');
const ListInvitation = require('../models/ListInvitation');
const { authenticate } = require('../middlewares/auth');
const { asyncHandler, createHttpError } = require('../utils/http');
const {
  createCollaboratorEntry,
  enrichListsWithStats
} = require('../services/listService');
const { normalizeCollaborators } = require('../utils/listPermissions');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function findInvitationByToken(token) {
  const invitation = await ListInvitation.findOne({ tokenHash: hashToken(token) });
  if (!invitation) {
    throw createHttpError(404, 'Invitation not found');
  }
  return invitation;
}

router.get('/:token', asyncHandler(async (req, res) => {
  const invitation = await findInvitationByToken(req.params.token);
  const list = await List.findById(invitation.listId).lean();
  if (!list) {
    throw createHttpError(404, 'List not found');
  }

  return res.json({
    email: invitation.email,
    expiresAt: invitation.expiresAt,
    list: {
      _id: list._id,
      title: list.title
    },
    permissions: invitation.permissions,
    status: invitation.status
  });
}));

router.post('/:token/accept', authenticate, asyncHandler(async (req, res) => {
  const invitation = await findInvitationByToken(req.params.token);
  const now = new Date();
  if (invitation.status !== 'pending') {
    throw createHttpError(400, 'Invitation is no longer pending');
  }
  if (invitation.expiresAt <= now) {
    invitation.status = 'expired';
    await invitation.save();
    throw createHttpError(400, 'Invitation has expired');
  }

  const signedInEmail = req.user.email?.toLowerCase();
  if (!signedInEmail || signedInEmail !== invitation.email) {
    throw createHttpError(403, 'Sign in with the invited email address');
  }

  const list = await List.findById(invitation.listId);
  if (!list) {
    throw createHttpError(404, 'List not found');
  }
  if (list.ownerUid === req.user.uid) {
    throw createHttpError(400, 'Owner cannot accept a collaborator invitation');
  }

  list.collaborators = normalizeCollaborators(list.collaborators || []);
  const existingIndex = list.collaborators.findIndex(
    collaborator => collaborator.uid === req.user.uid
  );
  if (existingIndex === -1) {
    list.collaborators.push(createCollaboratorEntry(req.user.uid, invitation.permissions));
  } else {
    list.collaborators[existingIndex] = createCollaboratorEntry(
      req.user.uid,
      invitation.permissions
    );
  }
  await list.save();

  invitation.status = 'accepted';
  invitation.acceptedByUid = req.user.uid;
  invitation.acceptedAt = now;
  await invitation.save();

  let enrichedList = list.toObject();
  try {
    const [nextList] = await enrichListsWithStats([enrichedList], req.user.uid);
    enrichedList = nextList;
  } catch (err) {
    console.error('⚠️ accept invitation enrichment failed', err);
  }

  return res.json(enrichedList);
}));

module.exports = router;
