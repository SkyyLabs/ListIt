const admin = require('firebase-admin');
const Category = require('../models/Category');
const Item = require('../models/Item');
const { DEFAULT_CATEGORY_NAME } = require('../config/constants');
const { createHttpError } = require('../utils/http');

function buildVisibleListFilter(uid, categoryId) {
  const filter = {
    $or: [
      { isPublic: true },
      ...(uid ? [{ ownerUid: uid }, { collaborators: uid }] : [])
    ]
  };

  if (categoryId) {
    filter.categoryId = categoryId;
  }

  return filter;
}

async function enrichLists(docs) {
  const uidSet = new Set();
  docs.forEach(list => {
    uidSet.add(list.ownerUid);
    (list.collaborators || []).forEach(collaborator => {
      const uid =
        typeof collaborator === 'string' ? collaborator : collaborator.uid;
      uidSet.add(uid);
    });
  });

  const uids = Array.from(uidSet);
  let users = [];
  if (uids.length) {
    try {
      const result = await admin
        .auth()
        .getUsers(uids.map(uid => ({ uid })));
      users = result.users;
    } catch (err) {
      console.error(
        '⚠️ enrichLists: getUsers failed, falling back to UIDs',
        err
      );
    }
  }

  const userMap = users.reduce((map, user) => {
    map[user.uid] = {
      email: user.email,
      displayName: user.displayName
    };
    return map;
  }, {});

  return docs.map(list => ({
    ...list,
    owner: {
      uid: list.ownerUid,
      email: userMap[list.ownerUid]?.email || null,
      displayName: userMap[list.ownerUid]?.displayName || null
    },
    collaborators: (list.collaborators || []).map(collaborator => {
      const uid =
        typeof collaborator === 'string' ? collaborator : collaborator.uid;
      return {
        uid,
        email: userMap[uid]?.email || null,
        displayName: userMap[uid]?.displayName || null
      };
    })
  }));
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

function assertListOwner(list, uid) {
  if (list.ownerUid !== uid) {
    throw createHttpError(403, 'Forbidden');
  }
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

module.exports = {
  assertListOwner,
  buildVisibleListFilter,
  countForeignItems,
  deleteListWithItems,
  enrichLists,
  findOrCreateCategoryByName,
  resolveCollaboratorUid
};
