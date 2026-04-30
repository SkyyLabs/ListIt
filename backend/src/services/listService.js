const admin = require('firebase-admin');
const Category = require('../models/Category');
const Item = require('../models/Item');
const List = require('../models/List');
const ListInvitation = require('../models/ListInvitation');
const ListReaction = require('../models/ListReaction');
const {
  COLLABORATOR_PERMISSIONS,
  DEFAULT_CATEGORY_NAME
} = require('../config/constants');
const { createHttpError } = require('../utils/http');
const {
  normalizeCollaborators,
  sanitizePermissions
} = require('../utils/listPermissions');

function buildVisibleListFilter(uid, categoryId) {
  const filter = {
    $or: [
      { isPublic: true },
      ...(uid
        ? [{ ownerUid: uid }, { 'collaborators.uid': uid }]
        : [])
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
    if (list.sourceOwnerUid) {
      uidSet.add(list.sourceOwnerUid);
    }
    normalizeCollaborators(list.collaborators || []).forEach(collaborator => {
      uidSet.add(collaborator.uid);
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

  const listIds = docs.map(list => String(list._id));
  let pendingInvitationsByList = {};
  if (listIds.length) {
    const invitations = await ListInvitation.find({
      listId: { $in: listIds },
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
      .select('listId email permissions expiresAt createdAt')
      .lean();

    pendingInvitationsByList = invitations.reduce((map, invitation) => {
      const key = String(invitation.listId);
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push({
        _id: invitation._id,
        email: invitation.email,
        permissions: invitation.permissions,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt
      });
      return map;
    }, {});
  }

  return docs.map(list => ({
    ...list,
    owner: {
      uid: list.ownerUid,
      email: userMap[list.ownerUid]?.email || null,
      displayName: userMap[list.ownerUid]?.displayName || null
    },
    source: list.sourceListId
      ? {
        listId: list.sourceListId,
        title: list.sourceTitle,
        ownerUid: list.sourceOwnerUid,
        owner: list.sourceOwnerUid
          ? {
            uid: list.sourceOwnerUid,
            email: userMap[list.sourceOwnerUid]?.email || null,
            displayName: userMap[list.sourceOwnerUid]?.displayName || null
          }
          : null
      }
      : null,
    collaborators: normalizeCollaborators(list.collaborators || []).map(collaborator => {
      const uid = collaborator.uid;
      return {
        uid,
        permissions: collaborator.permissions,
        email: userMap[uid]?.email || null,
        displayName: userMap[uid]?.displayName || null
      };
    }),
    pendingInvitations: pendingInvitationsByList[String(list._id)] || []
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

async function addSubCategoryToCategory(categoryId, subCategory) {
  if (!categoryId || !subCategory) {
    return;
  }

  const category = await Category.findById(categoryId);
  if (!category) {
    return;
  }

  const exists = category.subCategories.some(
    existingSubCategory =>
      existingSubCategory.toLowerCase() === subCategory.toLowerCase()
  );
  if (!exists) {
    category.subCategories.push(subCategory);
    await category.save();
  }
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

function createCollaboratorEntry(uid, permissions = [COLLABORATOR_PERMISSIONS.READ]) {
  return {
    uid,
    permissions: sanitizePermissions(permissions.length ? permissions : [COLLABORATOR_PERMISSIONS.READ])
  };
}

async function getUserActivityMap(uids = []) {
  const normalizedUids = Array.from(new Set(uids.filter(Boolean)));
  if (!normalizedUids.length) {
    return {};
  }

  const lists = await List.find({
    $or: [
      { ownerUid: { $in: normalizedUids } },
      { 'collaborators.uid': { $in: normalizedUids } }
    ]
  })
    .select('ownerUid collaborators')
    .lean();

  const activityMap = Object.fromEntries(normalizedUids.map(uid => [uid, 0]));

  lists.forEach(list => {
    if (activityMap[list.ownerUid] !== undefined) {
      activityMap[list.ownerUid] += 1;
    }

    normalizeCollaborators(list.collaborators || []).forEach(collaborator => {
      if (activityMap[collaborator.uid] !== undefined) {
        activityMap[collaborator.uid] += 1;
      }
    });
  });

  return activityMap;
}

function getActivityWeight(activityCount = 0) {
  if (activityCount >= 6) {
    return 3;
  }
  if (activityCount >= 3) {
    return 2;
  }
  return 1;
}

async function getReactionSummaryMap(lists, currentUserUid) {
  const listIds = lists.map(list => String(list._id));
  if (!listIds.length) {
    return {};
  }

  const reactions = await ListReaction.find({
    listId: { $in: listIds }
  }).lean();

  const activityMap = await getUserActivityMap([
    ...lists.map(list => list.ownerUid),
    ...reactions.map(reaction => reaction.uid)
  ]);

  const reactionSummaryMap = {};
  lists.forEach(list => {
    const ownerBaselineScore = getActivityWeight(activityMap[list.ownerUid] || 0);
    reactionSummaryMap[String(list._id)] = {
      likesCount: 0,
      dislikesCount: 0,
      reactionScore: 0,
      ownerBaselineScore,
      rankingScore: ownerBaselineScore,
      currentUserReaction: null
    };
  });

  reactions.forEach(reaction => {
    const listKey = String(reaction.listId);
    const summary = reactionSummaryMap[listKey];
    if (!summary) {
      return;
    }

    const weight = getActivityWeight(activityMap[reaction.uid] || 0);
    if (reaction.reaction === 'like') {
      summary.likesCount += 1;
      summary.reactionScore += weight;
    } else if (reaction.reaction === 'dislike') {
      summary.dislikesCount += 1;
      summary.reactionScore -= weight;
    }

    if (currentUserUid && reaction.uid === currentUserUid) {
      summary.currentUserReaction = reaction.reaction;
    }
  });

  Object.values(reactionSummaryMap).forEach(summary => {
    summary.rankingScore = summary.ownerBaselineScore + summary.reactionScore;
  });

  return reactionSummaryMap;
}

async function enrichListsWithStats(docs, currentUserUid) {
  const lists = await enrichLists(docs);
  const reactionSummaryMap = await getReactionSummaryMap(lists, currentUserUid);

  return lists.map(list => ({
    ...list,
    ...(reactionSummaryMap[String(list._id)] || {
      likesCount: 0,
      dislikesCount: 0,
      reactionScore: 0,
      ownerBaselineScore: 1,
      rankingScore: 1,
      currentUserReaction: null
    })
  }));
}

module.exports = {
  addSubCategoryToCategory,
  assertListOwner,
  buildVisibleListFilter,
  countForeignItems,
  createCollaboratorEntry,
  deleteListWithItems,
  ensureStructuredCollaborators,
  enrichLists,
  enrichListsWithStats,
  findOrCreateCategoryByName,
  getActivityWeight,
  getReactionSummaryMap,
  getUserActivityMap,
  resolveCollaboratorUid,
  resolveUserEmail
};
