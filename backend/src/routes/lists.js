// backend/src/routes/lists.js
const express = require('express');
const mongoose = require('mongoose');
const router  = express.Router();
const List    = require('../models/List');
const Item    = require('../models/Item');
const ListReaction = require('../models/ListReaction');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { asyncHandler, createHttpError } = require('../utils/http');
const { hasAdminRole } = require('../utils/roles');
const {
  cloneItemsSnapshotForDuplicate,
  cloneListSnapshotForDuplicate,
  convertListToPrivate,
  normalizePublicListForStorage,
  prepareNewItemForStorage,
  prepareNewListForStorage,
  serializeListForResponse
} = require('../services/privateListEncryption');
const {
  assertListOwner,
  buildVisibleListFilter,
  countForeignItems,
  createCollaboratorEntry,
  deleteListWithItems,
  enrichListsWithStats,
  ensureStructuredCollaborators,
  findOrCreateCategoryByName,
  resolveCollaboratorUid
} = require('../services/listService');
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
  normalizeCollaborators
} = require('../utils/listPermissions');
const { runInTransaction } = require('../utils/mongoTransaction');

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
  const serializedDocs = await Promise.all(docs.map(serializeListForResponse));

  let lists;
  try {
    lists = await enrichListsWithStats(serializedDocs, uid);
  } catch (err) {
    console.error('⚠️ enrichLists threw, returning raw docs', err);
    lists = serializedDocs;
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
    _id: new mongoose.Types.ObjectId(),
    title,
    categoryId: category._id,
    isPublic: !!isPublic,
    ownerUid: uid,
    collaborators: []
  });
  await prepareNewListForStorage(list);
  const saved = await list.save();
  return res.status(201).json(await serializeListForResponse(saved));
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
  const currentIsPublic = list.isPublic;
  const updated = await runInTransaction(async session => {
    let listItems = [];
    const needsItems =
      currentIsPublic !== !!isPublic || (!currentIsPublic && title !== undefined);
    if (needsItems) {
      let itemsQuery = Item.find({ listId: list._id });
      if (session && typeof itemsQuery.session === 'function') {
        itemsQuery = itemsQuery.session(session);
      }
      listItems = await itemsQuery;
    }

    if (title !== undefined) {
      list.title = title;
      list.titlePlain = title;
    }
    if (categoryId !== undefined) list.categoryId = categoryId;
    if (isPublic !== undefined) list.isPublic = !!isPublic;

    if (isPublic !== undefined && currentIsPublic !== !!isPublic) {
      if (list.isPublic) {
        await normalizePublicListForStorage(list, listItems);
      } else {
        await convertListToPrivate(list, listItems);
      }
    } else if (!list.isPublic) {
      await convertListToPrivate(list, listItems);
    } else {
      await prepareNewListForStorage(list);
    }

    for (const item of listItems) {
      await item.save(session ? { session } : undefined);
    }
    return list.save(session ? { session } : undefined);
  });
  return res.json(await serializeListForResponse(updated));
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
  return res.json(await serializeListForResponse(list));
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
  return res.json(await serializeListForResponse(list));
}));

/**
 * DELETE /lists/:id/collaborators/:collabUid
 * Remove collaborator (OWNER ONLY)
 */
router.delete('/:id/collaborators/:collabUid', asyncHandler(async (req, res) => {
  const list = await List.findById(req.params.id);
  if (!list) throw createHttpError(404, 'List not found');

  await ensureStructuredCollaborators(list);
  if (!canRemoveCollaborator(list, req.user.uid)) {
    throw createHttpError(403, 'Forbidden');
  }

  list.collaborators = list.collaborators.filter(
    collaborator => collaborator.uid !== req.params.collabUid
  );
  await list.save();
  return res.json(await serializeListForResponse(list));
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

  const [enrichedList] = await enrichListsWithStats(
    [await serializeListForResponse(normalizedList)],
    req.user.uid
  );
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

  const duplicatedList = await runInTransaction(async session => {
    const sourceSnapshot = await cloneListSnapshotForDuplicate(sourceList);
    const nextList = new List({
      _id: new mongoose.Types.ObjectId(),
      title: sourceSnapshot.title,
      categoryId: sourceList.categoryId,
      ownerUid: req.user.uid,
      isPublic: false,
      sourceListId: sourceList._id,
      sourceTitle: sourceSnapshot.title,
      sourceOwnerUid: sourceList.ownerUid,
      collaborators: []
    });
    await prepareNewListForStorage(nextList);
    await nextList.save(session ? { session } : undefined);

    const sourceItems = await Item.find({ listId: sourceList._id }).lean();
    if (sourceItems.length) {
      const sourceItemSnapshots = await cloneItemsSnapshotForDuplicate(sourceItems);
      const newItems = await Promise.all(sourceItemSnapshots.map(async item => {
        const nextItem = new Item({
          _id: new mongoose.Types.ObjectId(),
          listId: nextList._id,
          text: item.text,
          subCategory: item.subCategory,
          addedBy: req.user.uid,
          doneBy: Array.isArray(item.doneBy) && item.doneBy.includes(req.user.uid)
            ? [req.user.uid]
            : []
        });
        await prepareNewItemForStorage(nextItem, nextList);
        return typeof nextItem.toObject === 'function' ? nextItem.toObject() : nextItem;
      }));
      await Item.insertMany(newItems, session ? { session } : undefined);
    }

    return nextList;
  });

  const [enrichedList] = await enrichListsWithStats(
    [await serializeListForResponse(duplicatedList)],
    req.user.uid
  );
  return res.status(201).json(enrichedList);
}));

module.exports = router;
