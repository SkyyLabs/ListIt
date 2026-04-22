// backend/src/routes/categories.js
const express = require('express')
const router = express.Router()
const Category = require('../models/Category')
const { authenticate } = require('../middlewares/auth')
const { asyncHandler, createHttpError } = require('../utils/http')
const { hasAdminRole } = require('../utils/roles')
const {
  getTrimmedString,
  requireTrimmedString
} = require('../utils/validation')

// PUBLIC GET: list all public categories
router.get('/', asyncHandler(async (req, res) => {
  const cats = await Category.find({ isPublic: true }).lean()
  return res.json(cats)
}))

// All mutation routes require a logged-in user
router.use(authenticate)

// POST /categories → create a new category (always public)
router.post('/', asyncHandler(async (req, res) => {
  const name = requireTrimmedString(req.body.name, 'Category name is required')

  // case-insensitive upsert
  let cat = await Category.findOne({
    name: { $regex: `^${name}$`, $options: 'i' }
  })
  if (!cat) {
    cat = new Category({
      name,
      ownerUid: req.user.uid,
      isPublic: true
    })
    await cat.save()
  }
  return res.json(cat)
}))

// PUT /categories/:id → update a category's name (owner only)
router.put('/:id', asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.params.id)
  if (!cat) throw createHttpError(404, 'Category not found')
  if (cat.ownerUid !== req.user.uid && !hasAdminRole(req.user)) {
    throw createHttpError(403, 'Forbidden')
  }
  const name = getTrimmedString(req.body.name)
  if (name) cat.name = name
  // categories remain public
  const updated = await cat.save()
  return res.json(updated)
}))

// DELETE /categories/:id → only admin can delete
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!hasAdminRole(req.user)) {
    throw createHttpError(403, 'Only admins may delete categories')
  }
  const cat = await Category.findById(req.params.id)
  if (!cat) throw createHttpError(404, 'Category not found')
  await cat.remove()
  return res.sendStatus(204)
}))

module.exports = router
