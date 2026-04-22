// backend/src/routes/lists.js
const express = require('express');
const router  = express.Router();
const List    = require('../models/List');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { asyncHandler, createHttpError } = require('../utils/http');
const { hasAdminRole } = require('../utils/roles');
const {
  assertListOwner,
  buildVisibleListFilter,
  countForeignItems,
  deleteListWithItems,
  enrichLists,
  findOrCreateCategoryByName,
  resolveCollaboratorUid
} = require('../services/listService');
const {
  getTrimmedString,
  optionalTrimmedString,
  requireTrimmedString
} = require('../utils/validation');

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
    lists = await enrichLists(docs);
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
 * Invite collaborator by email or UID (OWNER ONLY)
 */
router.post('/:id/collaborators', asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) throw createHttpError(404, 'List not found');

  assertListOwner(list, req.user.uid);

  const email = optionalTrimmedString(
    req.body.email,
    'email must be a non-empty string'
  );
  const collabUid = await resolveCollaboratorUid(
    email,
    getTrimmedString(req.body.uid)
  );

  if (!list.collaborators.includes(collabUid)) {
    list.collaborators.push(collabUid);
    await list.save();
  }
  return res.json(list);
}));

/**
 * DELETE /lists/:id/collaborators/:collabUid
 * Remove collaborator (OWNER ONLY)
 */
router.delete('/:id/collaborators/:collabUid', asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) throw createHttpError(404, 'List not found');

  assertListOwner(list, req.user.uid);

  list.collaborators = list.collaborators.filter(
    u => u !== req.params.collabUid
  );
  await list.save();
  return res.json(list);
}));

module.exports = router;
