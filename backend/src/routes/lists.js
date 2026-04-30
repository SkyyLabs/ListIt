// backend/src/routes/lists.js
const crypto = require('node:crypto');
const admin = require('firebase-admin');
const express = require('express');
const router  = express.Router();
const Category = require('../models/Category');
const List    = require('../models/List');
const Item    = require('../models/Item');
const ListInvitation = require('../models/ListInvitation');
const ListReaction = require('../models/ListReaction');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { asyncHandler, createHttpError } = require('../utils/http');
const { hasAdminRole } = require('../utils/roles');
const {
  COLLABORATOR_PERMISSIONS,
  DEFAULT_CATEGORY_NAME
} = require('../config/constants');
const {
  buildVisibleListFilter,
  enrichListsWithStats
} = require('../services/listService');
const {
  buildInviteUrl,
  sendCollaboratorRemovedEmail,
  sendInvitationCanceledEmail,
  sendInvitationEmail
} = require('../services/emailService');
const {
  getTrimmedString,
  optionalTrimmedString,
  requireTrimmedString
} = require('../utils/validation');
const {
  canViewList,
  canInviteCollaborators,
  canRemoveCollaborator,
  canUpdateCollaboratorPermissions,
  createCollaboratorEntry,
  normalizeCollaborators,
  sanitizePermissions
} = require('../utils/listPermissions');

const INVITATION_TTL_DAYS = 7;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function sendNotificationSafely(sendEmail, payload, context) {
  try {
    await sendEmail(payload);
  } catch (err) {
    console.error(`Failed to send ${context} email`, err);
  }
}

function assertListOwner(list, uid) {
  if (list.ownerUid !== uid) {
    throw createHttpError(403, 'Forbidden');
  }
}

async function findOrCreateCategoryByName(categoryName, ownerUid) {
  const rawName = categoryName || DEFAULT_CATEGORY_NAME;
  let category = await Category.findOne({
    name: { $regex: `^${rawName}$`, $options: 'i' }
  });

  if (!category) {
    category = new Category({
      name: rawName,
      ownerUid,
      isPublic: true
    });
    await category.save();
  }

  return category;
}

async function resolveCollaboratorUid(email, uid) {
  if (email) {
    const userRecord = await admin.auth().getUserByEmail(email);
    return userRecord.uid;
  }

  if (!uid) {
    throw createHttpError(400, 'Must provide email or uid');
  }

  return uid;
}

async function resolveUserEmail(uid) {
  if (!uid) {
    return null;
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord.email || null;
  } catch (err) {
    console.warn(`⚠️ Could not resolve email for uid ${uid}: ${err.message}`);
    return null;
  }
}

async function countForeignItems(list) {
  return Item.countDocuments({
    listId: list._id,
    addedBy: { $ne: list.ownerUid }
  });
}

async function deleteListWithItems(list) {
  await Item.deleteMany({ listId: list._id });
  await list.remove();
}

async function ensureStructuredCollaborators(list) {
  const normalized = normalizeCollaborators(list.collaborators || []);
  const changed =
    normalized.length !== (list.collaborators || []).length ||
    normalized.some((collaborator, index) => {
      const current = list.collaborators?.[index];
      return typeof current === 'string'
        || current?.uid !== collaborator.uid
        || JSON.stringify(current?.permissions || []) !== JSON.stringify(collaborator.permissions);
    });

  if (changed) {
    list.collaborators = normalized;
    await list.save();
  }

  return list;
}

/**
 * GET /lists
 * Public: see all isPublic OR owned OR collaborated
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const uid = req.user?.uid;
  const filter = buildVisibleListFilter(uid, req.query.categoryId);

  const docs = await List.find(filter)
    .populate('categoryId')
    .lean();

  let lists;
  try {
    lists = await enrichListsWithStats(docs, uid);
  } catch (err) {
    console.error('⚠️ enrichLists threw, returning raw docs', err);
    lists = docs;
  }
  return res.json(lists);
}));

// All mutation routes require a logged-in user
router.use(authenticate);

/**
 * POST /lists
 * Creates a list.  Body may be { title, categoryName?, isPublic }.
 *  - If categoryName missing or blank ⇒ use “Other”
 *  - Else: case-insensitive lookup; if not found, create it.
 */
router.post('/', asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  const title = requireTrimmedString(req.body.title, 'Title required');
  const categoryName = optionalTrimmedString(
    req.body.categoryName,
    'categoryName must be a non-empty string'
  );
  const { isPublic } = req.body;
  const category = await findOrCreateCategoryByName(categoryName, uid);

  const list = new List({
    title,
    categoryId: category._id,
    isPublic: !!isPublic,
    ownerUid: uid,
    collaborators: []
  });
  const saved = await list.save();
  return res.status(201).json(saved);
}));

/**
 * PUT /lists/:id
 * Update list metadata (OWNER ONLY)
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) throw createHttpError(404, 'List not found');

  assertListOwner(list, req.user.uid);

  const title = optionalTrimmedString(req.body.title, 'Title required');
  const { categoryId, isPublic } = req.body;
  if (title !== undefined) list.title = title;
  if (categoryId !== undefined) list.categoryId = categoryId;
  if (isPublic !== undefined) list.isPublic = !!isPublic;

  const updated = await list.save();
  return res.json(updated);
}));

/**
 * DELETE /lists/:id
 * OWNER can delete (if no foreign items),
 * ADMIN can delete only public lists
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) throw createHttpError(404, 'List not found');

  const uid = req.user.uid;
  const isOwner = list.ownerUid === uid;
  const isAdmin = hasAdminRole(req.user);
  const foreignCount = await countForeignItems(list);

  if (isOwner && foreignCount === 0) {
    await deleteListWithItems(list);
    return res.sendStatus(204);
  }

  if (isAdmin && list.isPublic) {
    await deleteListWithItems(list);
    return res.sendStatus(204);
  }

  throw createHttpError(403, 'Forbidden');
}));

/**
 * POST /lists/:id/collaborators
 * Invite collaborator by email or UID.
 */
router.post('/:id/collaborators', asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) throw createHttpError(404, 'List not found');

  await ensureStructuredCollaborators(list);
  if (!canInviteCollaborators(list, req.user.uid)) {
    throw createHttpError(403, 'Forbidden');
  }

  const email = optionalTrimmedString(
    req.body.email,
    'email must be a non-empty string'
  );
  const collabUid = await resolveCollaboratorUid(
    email,
    getTrimmedString(req.body.uid)
  );
  if (collabUid === list.ownerUid) {
    throw createHttpError(400, 'Owner cannot be added as a collaborator');
  }

  const permissions = Array.isArray(req.body.permissions)
    ? req.body.permissions
    : undefined;

  const existingIndex = list.collaborators.findIndex(collaborator =>
    collaborator.uid === collabUid || collaborator === collabUid
  );
  if (existingIndex === -1) {
    list.collaborators.push(createCollaboratorEntry(collabUid, permissions));
  } else if (permissions) {
    list.collaborators[existingIndex] = createCollaboratorEntry(collabUid, permissions);
    await list.save();
  }
  if (existingIndex === -1) {
    await list.save();
  }
  return res.json(list);
}));

router.post('/:id/invitations', asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) throw createHttpError(404, 'List not found');

  await ensureStructuredCollaborators(list);
  if (!canInviteCollaborators(list, req.user.uid)) {
    throw createHttpError(403, 'Forbidden');
  }

  const email = normalizeEmail(
    requireTrimmedString(req.body.email, 'email is required')
  );
  const permissions = sanitizePermissions(
    Array.isArray(req.body.permissions) && req.body.permissions.length
      ? req.body.permissions
      : [COLLABORATOR_PERMISSIONS.READ]
  );

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await ListInvitation.findOneAndUpdate(
    {
      listId: list._id,
      email,
      status: 'pending'
    },
    {
      $set: {
        permissions,
        invitedByUid: req.user.uid,
        tokenHash: hashToken(token),
        expiresAt
      },
      $setOnInsert: {
        listId: list._id,
        email
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const inviteUrl = buildInviteUrl(token);
  await sendInvitationEmail({
    email,
    inviteUrl,
    listTitle: list.title
  });

  return res.status(201).json({
    _id: invitation._id,
    email: invitation.email,
    permissions: invitation.permissions,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt
  });
}));

router.delete('/:id/invitations/:invitationId', asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) throw createHttpError(404, 'List not found');

  await ensureStructuredCollaborators(list);
  if (!canInviteCollaborators(list, req.user.uid)) {
    throw createHttpError(403, 'Forbidden');
  }

  const invitation = await ListInvitation.findOneAndDelete({
    _id: req.params.invitationId,
    listId: list._id,
    status: 'pending'
  });
  if (!invitation) {
    throw createHttpError(404, 'Invitation not found');
  }

  await sendNotificationSafely(
    sendInvitationCanceledEmail,
    {
      email: invitation.email,
      listTitle: list.title
    },
    'invitation cancellation'
  );

  return res.sendStatus(204);
}));

router.put('/:id/collaborators/:collabUid', asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) throw createHttpError(404, 'List not found');

  await ensureStructuredCollaborators(list);
  if (!canUpdateCollaboratorPermissions(list, req.user.uid)) {
    throw createHttpError(403, 'Forbidden');
  }

  const collaboratorIndex = list.collaborators.findIndex(
    collaborator => collaborator.uid === req.params.collabUid
  );
  if (collaboratorIndex === -1) {
    throw createHttpError(404, 'Collaborator not found');
  }

  list.collaborators[collaboratorIndex] = createCollaboratorEntry(
    req.params.collabUid,
    req.body.permissions
  );
  await list.save();
  return res.json(list);
}));

/**
 * DELETE /lists/:id/collaborators/:collabUid
 * Remove collaborator.
 */
router.delete('/:id/collaborators/:collabUid', asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) throw createHttpError(404, 'List not found');

  await ensureStructuredCollaborators(list);
  if (!canRemoveCollaborator(list, req.user.uid, req.params.collabUid)) {
    throw createHttpError(403, 'Forbidden');
  }
  if (req.params.collabUid === list.ownerUid) {
    throw createHttpError(400, 'Owner cannot be removed as a collaborator');
  }

  const removedCollaboratorEmail = await resolveUserEmail(req.params.collabUid);
  list.collaborators = list.collaborators.filter(
    collaborator => collaborator.uid !== req.params.collabUid
  );
  await list.save();
  if (removedCollaboratorEmail) {
    await sendNotificationSafely(
      sendCollaboratorRemovedEmail,
      {
        email: removedCollaboratorEmail,
        listTitle: list.title
      },
      'collaborator removal'
    );
  }
  return res.json(list);
}));

router.put('/:id/reaction', asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) throw createHttpError(404, 'List not found');
  const normalizedList = {
    ...(typeof list.toObject === 'function' ? list.toObject() : list),
    collaborators: normalizeCollaborators(list.collaborators || [])
  };
  if (!canViewList(normalizedList, req.user.uid)) {
    throw createHttpError(403, 'Forbidden');
  }

  const reaction = req.body.reaction;
  if (reaction !== null && reaction !== 'like' && reaction !== 'dislike') {
    throw createHttpError(400, 'reaction must be like, dislike, or null');
  }

  if (reaction === null) {
    await ListReaction.deleteOne({ listId: list._id, uid: req.user.uid });
  } else {
    await ListReaction.findOneAndUpdate(
      { listId: list._id, uid: req.user.uid },
      {
        $set: { reaction },
        $setOnInsert: {
          listId: list._id,
          uid: req.user.uid
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const [enrichedList] = await enrichListsWithStats([normalizedList], req.user.uid);
  return res.json(enrichedList);
}));

router.post('/:id/duplicate', asyncHandler(async (req, res) => {
  const sourceList = await List.findById(req.params.id).lean();
  if (!sourceList) throw createHttpError(404, 'List not found');

  const normalizedSourceList = {
    ...sourceList,
    collaborators: normalizeCollaborators(sourceList.collaborators || [])
  };
  if (!canViewList(normalizedSourceList, req.user.uid)) {
    throw createHttpError(403, 'Forbidden');
  }

  const duplicatedList = await List.create({
    title: sourceList.title,
    categoryId: sourceList.categoryId,
    ownerUid: req.user.uid,
    isPublic: false,
    sourceListId: sourceList._id,
    sourceTitle: sourceList.title,
    sourceOwnerUid: sourceList.ownerUid,
    collaborators: []
  });

  const sourceItems = await Item.find({ listId: sourceList._id }).lean();
  if (sourceItems.length) {
    await Item.insertMany(
      sourceItems.map(item => ({
        listId: duplicatedList._id,
        text: item.text,
        subCategory: item.subCategory,
        addedBy: req.user.uid,
        doneBy: Array.isArray(item.doneBy) && item.doneBy.includes(req.user.uid)
          ? [req.user.uid]
          : []
      }))
    );
  }

  const [enrichedList] = await enrichListsWithStats(
    [duplicatedList.toObject()],
    req.user.uid
  );
  return res.status(201).json(enrichedList);
}));

module.exports = router;
