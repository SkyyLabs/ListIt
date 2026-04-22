import { COLLABORATOR_PERMISSIONS } from '../config/constants';

export function normalizeCollaborator(collaborator) {
  if (!collaborator) {
    return null;
  }

  if (typeof collaborator === 'string') {
    return {
      uid: collaborator,
      permissions: [COLLABORATOR_PERMISSIONS.READ]
    };
  }

  return {
    ...collaborator,
    permissions: Array.isArray(collaborator.permissions)
      ? collaborator.permissions
      : [COLLABORATOR_PERMISSIONS.READ]
  };
}

export function hasPermission(collaborator, permission) {
  return normalizeCollaborator(collaborator)?.permissions.includes(permission);
}
