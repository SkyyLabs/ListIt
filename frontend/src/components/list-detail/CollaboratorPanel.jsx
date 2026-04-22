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
    <>
      <button
        onClick={toggleCollaborators}
        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 transition hover:bg-white sm:text-sm"
      >
        Collaborators
      </button>
      {showCollaborators && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-base font-semibold sm:text-lg">Collaborators</h4>
              <button
                onClick={toggleCollaborators}
                className="rounded px-2 py-1 text-xl leading-none text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {collaborators.length > 0 ? (
              <ul className="soft-scrollbar mb-4 max-h-[280px] space-y-2 overflow-auto pr-1">
                {collaborators.map(collaborator => (
                  <li
                    key={collaborator.uid}
                    className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3 text-xs sm:text-sm"
                  >
                    <div className="flex-1">
                      <div>{getUserDisplayLabel(collaborator)}</div>
                      {collaborator.uid !== ownerUid && (
                        <div className="mt-2 flex flex-wrap gap-2">
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
                        className="px-2 font-bold text-red-500"
                        title="Remove collaborator"
                      >
                        −
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mb-4 text-xs text-gray-500 sm:text-sm">
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
                    className="w-full rounded border px-2 py-1 text-xs sm:text-sm"
                    required
                  />
                  <div className="flex flex-wrap gap-2">
                    {Object.values(COLLABORATOR_PERMISSIONS).map(permission => (
                      <label key={permission} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={invitePermissions.includes(permission)}
                          disabled={permission === COLLABORATOR_PERMISSIONS.READ || disabled}
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
                  className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700 sm:px-4 sm:py-2 sm:text-sm"
                >
                  Invite
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
