// backend/src/routes/items.js
const express       = require('express')
const router        = express.Router()
const Item          = require('../models/Item')
const List          = require('../models/List')
const Category      = require('../models/Category')       // ← make sure this is imported
const { authenticate, optionalAuth } = require('../middlewares/auth')
const { asyncHandler, createHttpError } = require('../utils/http')
const { hasAdminRole } = require('../utils/roles')
const {
  optionalTrimmedString,
  requireBoolean,
  requireTrimmedString
} = require('../utils/validation')

function canViewList(list, uid) {
  return Boolean(
    list.isPublic ||
    (uid && (list.ownerUid === uid || list.collaborators.includes(uid)))
  )
}

function canEditList(list, uid) {
  return Boolean(uid && (list.ownerUid === uid || list.collaborators.includes(uid)))
}

async function getListOrThrow(listId) {
  const list = await List.findById(listId).lean()
  if (!list) {
    throw createHttpError(404, 'List not found')
  }

  return list
}

/**
 * GET /items/:listId
 * Returns all items for a given list, marking each
 * with `{ done: Boolean }` based on whether the
 * current user’s UID is in its `doneBy` array.
 */
router.get('/:listId', optionalAuth, asyncHandler(async (req, res) => {
  const uid = req.user?.uid
  const list = await getListOrThrow(req.params.listId)
  if (!canViewList(list, uid)) {
    throw createHttpError(403, 'Forbidden')
  }

  const items = await Item.find({ listId: req.params.listId }).lean()
  const result = items.map(i => ({
    ...i,
    // The persisted source of truth is `doneBy`; `done` is a response-only
    // convenience field computed for the current viewer.
    done: Array.isArray(i.doneBy) && uid
      ? i.doneBy.includes(uid)
      : false
  }))
  return res.json(result)
}))

/**
 * POST /items
 * Creates a new item, and if it has a subCategory,
 * upserts that subCategory into the parent Category’s
 * `subCategories` array (case-insensitive).
 *
 * Body: { listId, text, subCategory? }
 */
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { listId } = req.body
  const text = requireTrimmedString(req.body.text, 'Item text is required')
  const subCategory = optionalTrimmedString(
    req.body.subCategory,
    'Sub-category must be a non-empty string'
  )
  const parentList = await getListOrThrow(listId)
  if (!canEditList(parentList, req.user.uid)) {
    throw createHttpError(403, 'Forbidden')
  }

  // 1) Create the Item
  const item = new Item({
    listId,
    text,
    subCategory,
    addedBy: req.user.uid
  })
  const saved = await item.save()

  // 2) If a subCategory was provided, add it to the Category
  if (saved.subCategory) {
    if (parentList?.categoryId) {
      const cat = await Category.findById(parentList.categoryId)
      if (cat) {
        const exists = cat.subCategories.some(
          sc => sc.toLowerCase() === saved.subCategory.toLowerCase()
        )
        if (!exists) {
          cat.subCategories.push(saved.subCategory)
          await cat.save()
        }
      }
    }
  }

  return res.status(201).json(saved)
}))

/**
 * PUT /items/:id
 * Toggle done state (only the owner of the done mark may toggle their own),
 * and return the updated item.
 *
 * Body: { done: Boolean }
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id)
  if (!item) {
    throw createHttpError(404, 'Item not found')
  }

  const uid = req.user.uid
  const done = requireBoolean(req.body.done, 'done must be a boolean')
  const parentList = await getListOrThrow(item.listId)
  if (!canEditList(parentList, uid)) {
    throw createHttpError(403, 'Forbidden')
  }

  // Each user owns only their own completion state. Rebuild this user's
  // entry first, then add it back only when the requested state is done.
  item.doneBy = (item.doneBy || []).filter(u => u !== uid)
  if (done) {
    item.doneBy.push(uid)
  }

  const updated = await item.save()
  // Compute `done` for this user
  const response = {
    ...updated.toObject(),
    done: updated.doneBy.includes(uid)
  }
  return res.json(response)
}))

/**
 * DELETE /items/:id
 * Only the user who added the item (or admin) can delete it.
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id)
  if (!item) {
    throw createHttpError(404, 'Item not found')
  }

  const uid = req.user.uid
  const isAdmin = hasAdminRole(req.user)
  if (!isAdmin) {
    const parentList = await getListOrThrow(item.listId)
    if (!canEditList(parentList, uid)) {
      throw createHttpError(403, 'Forbidden')
    }
  }

  if (item.addedBy !== uid && !isAdmin) {
    throw createHttpError(403, "Cannot delete another user's item")
  }

  await item.remove()
  return res.sendStatus(204)
}))

module.exports = router
