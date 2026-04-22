import React from 'react';
import { COLLABORATOR_PERMISSIONS } from '../../config/constants';
import { getUserDisplayLabel } from '../../utils/sorting';

export default function CollaboratorPanel({
  collaborators,
  disabled,
  inviteEmail,
  invitePermissions,
  canInvite,
  canManagePermissions,
  canRemoveCollaborator,
  onInvite,
  onInviteEmailChange,
  onInvitePermissionToggle,
  onPermissionChange,
  onRemoveCollaborator,
  ownerUid,
  showCollaborators,
  toggleCollaborators
}) {
  return (
    <div className="mb-4">
      <button
        onClick={toggleCollaborators}
        disabled={disabled}
        className="text-xs sm:text-sm text-gray-700 hover:underline mb-2"
      >
        {showCollaborators ? 'Hide Collaborators' : 'Show Collaborators'}
      </button>
      {showCollaborators && (
        <div className="bg-white p-3 sm:p-4 rounded-md shadow-inner">
          <h4 className="font-semibold mb-2 text-sm sm:text-base">
            Collaborators
          </h4>
          {collaborators.length > 0 ? (
            <ul className="list-inside mb-2 space-y-1">
              {collaborators.map(collaborator => (
                <li
                  key={collaborator.uid}
                  className="flex items-start justify-between gap-3 text-xs sm:text-sm"
                >
                  <div className="flex-1">
                    <div>{getUserDisplayLabel(collaborator)}</div>
                    {collaborator.uid !== ownerUid && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.values(COLLABORATOR_PERMISSIONS).map(permission => (
                          <label key={permission} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={(collaborator.permissions || []).includes(permission)}
                              disabled={
                                permission === COLLABORATOR_PERMISSIONS.READ
                                || !canManagePermissions
                                || disabled
                              }
                              onChange={event =>
                                onPermissionChange(
                                  collaborator.uid,
                                  permission,
                                  event.target.checked
                                )
                              }
                            />
                            {permission}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {canRemoveCollaborator && collaborator.uid !== ownerUid && (
                    <button
                      onClick={() => onRemoveCollaborator(collaborator.uid)}
                      disabled={disabled}
                      className="text-red-500 font-bold px-2"
                      title="Remove collaborator"
                    >
                      −
                    </button>
                  )}
                </li>
              ))}
            </ul>
              ) : (
                <div className="text-xs sm:text-sm text-gray-500">
                  No collaborators
                </div>
              )}
          {canInvite && (
            <form onSubmit={onInvite} className="flex gap-2">
              <div className="flex-1 space-y-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => onInviteEmailChange(e.target.value)}
                  placeholder="Invite by email"
                  disabled={disabled}
                  className="w-full border rounded px-2 py-1 text-xs sm:text-sm"
                  required
                />
                <div className="flex flex-wrap gap-2">
                  {Object.values(COLLABORATOR_PERMISSIONS).map(permission => (
                    <label key={permission} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={invitePermissions.includes(permission)}
                        disabled={
                          permission === COLLABORATOR_PERMISSIONS.READ || disabled
                        }
                        onChange={event =>
                          onInvitePermissionToggle(permission, event.target.checked)
                        }
                      />
                      {permission}
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={disabled}
                className="bg-indigo-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded hover:bg-indigo-700 text-xs sm:text-sm"
              >
                Invite
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
