const { COLLABORATOR_PERMISSIONS } = require('../config/constants');
const { createHttpError } = require('./http');

const ALL_COLLABORATOR_PERMISSIONS = new Set(Object.values(COLLABORATOR_PERMISSIONS));

function sanitizePermissions(permissions = []) {
  if (!Array.isArray(permissions)) {
    throw createHttpError(400, 'permissions must be an array');
  }

  const normalized = permissions
    .filter(permission => typeof permission === 'string')
    .map(permission => permission.trim())
    .filter(Boolean)
    .filter(permission => ALL_COLLABORATOR_PERMISSIONS.has(permission));

  return Array.from(new Set(normalized));
}

function normalizeCollaborator(collaborator) {
  if (!collaborator) {
    return null;
  }

  if (typeof collaborator === 'string') {
    return {
      uid: collaborator,
      permissions: [COLLABORATOR_PERMISSIONS.READ]
    };
  }

  const uid = typeof collaborator.uid === 'string'
    ? collaborator.uid.trim()
    : '';
  if (!uid) {
    return null;
  }

  return {
    uid,
    permissions: sanitizePermissions(
      collaborator.permissions?.length
        ? collaborator.permissions
        : [COLLABORATOR_PERMISSIONS.READ]
    )
  };
}

function normalizeCollaborators(collaborators = []) {
  return collaborators
    .map(normalizeCollaborator)
    .filter(Boolean)
    .filter((collaborator, index, arr) =>
      arr.findIndex(entry => entry.uid === collaborator.uid) === index
    );
}

function getCollaboratorEntry(list, uid) {
  return normalizeCollaborators(list?.collaborators || [])
    .find(collaborator => collaborator.uid === uid) || null;
}

function hasPermission(list, uid, permission) {
  const collaborator = getCollaboratorEntry(list, uid);
  return Boolean(collaborator && collaborator.permissions.includes(permission));
}

function isOwner(list, uid) {
  return Boolean(uid && list?.ownerUid === uid);
}

function isCollaborator(list, uid) {
  return Boolean(getCollaboratorEntry(list, uid));
}

function canViewList(list, uid) {
  return Boolean(list?.isPublic || isOwner(list, uid) || isCollaborator(list, uid));
}

function canToggleProgress(list, uid) {
  return Boolean(isOwner(list, uid) || isCollaborator(list, uid));
}

function canAddRemoveItems(list, uid) {
  return Boolean(
    isOwner(list, uid) ||
    hasPermission(list, uid, COLLABORATOR_PERMISSIONS.ADD_REMOVE) ||
    hasPermission(list, uid, COLLABORATOR_PERMISSIONS.EDIT_ALL)
  );
}

function canEditAll(list, uid) {
  return Boolean(
    isOwner(list, uid) ||
    hasPermission(list, uid, COLLABORATOR_PERMISSIONS.EDIT_ALL)
  );
}

function canInviteCollaborators(list, uid) {
  return canEditAll(list, uid);
}

function canUpdateCollaboratorPermissions(list, uid) {
  return canEditAll(list, uid);
}

function canRemoveCollaborator(list, uid) {
  return canEditAll(list, uid);
}

module.exports = {
  canAddRemoveItems,
  canEditAll,
  canInviteCollaborators,
  canRemoveCollaborator,
  canToggleProgress,
  canUpdateCollaboratorPermissions,
  canViewList,
  getCollaboratorEntry,
  hasPermission,
  isCollaborator,
  isOwner,
  normalizeCollaborator,
  normalizeCollaborators,
  sanitizePermissions
};
