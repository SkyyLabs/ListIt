import React from 'react';
import { COLLABORATOR_PERMISSIONS } from '../../config/constants';
import { getUserDisplayLabel } from '../../utils/sorting';

export default function CollaboratorPanel({
  collaborators,
  pendingInvitations = [],
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
        className="secondary-button px-3 py-2 text-xs"
      >
        Collaborators
      </button>
      {showCollaborators && (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xl font-semibold text-slate-950">Collaborators</h4>
              <button
                onClick={toggleCollaborators}
                className="icon-button"
              >
                ×
              </button>
            </div>

            {collaborators.length > 0 ? (
              <ul className="soft-scrollbar mb-4 max-h-[280px] space-y-2 overflow-auto pr-1">
                {collaborators.map(collaborator => (
                  <li
                    key={collaborator.uid}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-xs sm:text-sm"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{getUserDisplayLabel(collaborator)}</div>
                      {collaborator.uid !== ownerUid && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.values(COLLABORATOR_PERMISSIONS).map(permission => (
                            <label key={permission} className="chip gap-2">
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
                        className="icon-button text-rose-600"
                        title="Remove collaborator"
                      >
                        −
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No collaborators
              </div>
            )}

            {pendingInvitations.length > 0 && (
              <div className="mb-4 rounded-2xl bg-amber-50 p-3">
                <div className="mb-2 text-xs font-semibold uppercase text-amber-700">
                  Pending invitations
                </div>
                <ul className="space-y-2">
                  {pendingInvitations.map(invitation => (
                    <li
                      key={invitation._id || invitation.email}
                      className="flex items-start justify-between gap-3 rounded-xl bg-white/75 px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{invitation.email}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {(invitation.permissions || []).join(', ')}
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                        Pending
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canInvite && (
              <form onSubmit={onInvite} className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => onInviteEmailChange(e.target.value)}
                    placeholder="Invite by email"
                    disabled={disabled}
                    className="field"
                    required
                  />
                  <div className="flex flex-wrap gap-2">
                    {Object.values(COLLABORATOR_PERMISSIONS).map(permission => (
                      <label key={permission} className="chip gap-2">
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
                  className="primary-button self-start"
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
