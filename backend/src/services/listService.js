const admin = require('firebase-admin');
const List = require('../models/List');
const ListInvitation = require('../models/ListInvitation');
const ListReaction = require('../models/ListReaction');
const {
  normalizeCollaborators
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
  buildVisibleListFilter,
  enrichLists,
  enrichListsWithStats,
  getActivityWeight,
  getReactionSummaryMap,
  getUserActivityMap
};
