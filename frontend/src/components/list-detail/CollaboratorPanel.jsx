import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { COLLABORATOR_PERMISSIONS } from '../../config/constants';
import { getUserDisplayLabel } from '../../utils/sorting';

const ACCESS_LEVELS = [
  {
    value: 'read',
    label: 'Read Only',
    permissions: [COLLABORATOR_PERMISSIONS.READ]
  },
  {
    value: 'edit',
    label: 'Edit',
    permissions: [
      COLLABORATOR_PERMISSIONS.READ,
      COLLABORATOR_PERMISSIONS.ADD_REMOVE
    ]
  },
  {
    value: 'edit_all',
    label: 'Edit All',
    permissions: [
      COLLABORATOR_PERMISSIONS.READ,
      COLLABORATOR_PERMISSIONS.ADD_REMOVE,
      COLLABORATOR_PERMISSIONS.EDIT_ALL
    ]
  }
];

const accessLevelMap = Object.fromEntries(
  ACCESS_LEVELS.map(level => [level.value, level])
);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function permissionsToAccessLevel(permissions = []) {
  if (permissions.includes(COLLABORATOR_PERMISSIONS.EDIT_ALL)) {
    return 'edit_all';
  }
  if (permissions.includes(COLLABORATOR_PERMISSIONS.ADD_REMOVE)) {
    return 'edit';
  }
  return 'read';
}

function accessLevelToPermissions(accessLevel) {
  return accessLevelMap[accessLevel]?.permissions || accessLevelMap.read.permissions;
}

function getCollaboratorErrorMessage(err) {
  const responseData = err.response?.data;
  if (typeof responseData === 'string' && responseData.trim().startsWith('<!DOCTYPE html>')) {
    return 'The collaborator update route is not available on the running backend. Restart the backend server and try again.';
  }
  return responseData || err.message || 'Failed to save collaborator changes.';
}

export default function CollaboratorPanel({
  collaborators,
  pendingInvitations = [],
  canInvite,
  canManagePermissions,
  canRemoveCollaborator,
  currentUserUid,
  onSaveCollaboratorChanges,
  ownerUid,
  showCollaborators,
  toggleCollaborators
}) {
  const editableCollaborators = useMemo(
    () => collaborators.filter(collaborator => collaborator.uid !== ownerUid),
    [collaborators, ownerUid]
  );
  const [draftAccessLevels, setDraftAccessLevels] = useState({});
  const [removedUids, setRemovedUids] = useState(new Set());
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAccessLevel, setInviteAccessLevel] = useState('read');
  const [stagedInvites, setStagedInvites] = useState([]);
  const [canceledInvitationIds, setCanceledInvitationIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!showCollaborators) {
      return;
    }

    setDraftAccessLevels(
      Object.fromEntries(
        editableCollaborators.map(collaborator => [
          collaborator.uid,
          permissionsToAccessLevel(collaborator.permissions || [])
        ])
      )
    );
    setRemovedUids(new Set());
    setInviteEmail('');
    setInviteAccessLevel('read');
    setStagedInvites([]);
    setCanceledInvitationIds(new Set());
    setLocalError('');
  }, [editableCollaborators, showCollaborators]);

  const stageInvite = event => {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setLocalError('Enter collaborator email.');
      return;
    }
    if (!emailPattern.test(email)) {
      setLocalError('Enter a valid email address.');
      return;
    }

    setStagedInvites(currentInvites => [
      {
        email,
        accessLevel: inviteAccessLevel,
        permissions: accessLevelToPermissions(inviteAccessLevel)
      },
      ...currentInvites.filter(invite => invite.email !== email)
    ]);
    setInviteEmail('');
    setInviteAccessLevel('read');
    setLocalError('');
  };

  const removeStagedInvite = email => {
    setStagedInvites(currentInvites =>
      currentInvites.filter(invite => invite.email !== email)
    );
  };

  const toggleRemoval = uid => {
    setRemovedUids(currentRemovedUids => {
      const nextRemovedUids = new Set(currentRemovedUids);
      if (nextRemovedUids.has(uid)) {
        nextRemovedUids.delete(uid);
      } else {
        nextRemovedUids.add(uid);
      }
      return nextRemovedUids;
    });
  };

  const togglePendingInvitationCancellation = invitationId => {
    setCanceledInvitationIds(currentInvitationIds => {
      const nextInvitationIds = new Set(currentInvitationIds);
      if (nextInvitationIds.has(invitationId)) {
        nextInvitationIds.delete(invitationId);
      } else {
        nextInvitationIds.add(invitationId);
      }
      return nextInvitationIds;
    });
  };

  const handleDone = async () => {
    const pendingEmail = inviteEmail.trim().toLowerCase();
    if (pendingEmail && !emailPattern.test(pendingEmail)) {
      setLocalError('Enter a valid email address.');
      return;
    }

    const invitesToCreate = pendingEmail
      ? [
        {
          email: pendingEmail,
          accessLevel: inviteAccessLevel,
          permissions: accessLevelToPermissions(inviteAccessLevel)
        },
        ...stagedInvites.filter(invite => invite.email !== pendingEmail)
      ]
      : stagedInvites;

    const permissionUpdates = editableCollaborators
      .filter(collaborator => !removedUids.has(collaborator.uid))
      .map(collaborator => {
        const nextAccessLevel = draftAccessLevels[collaborator.uid] || 'read';
        const currentAccessLevel = permissionsToAccessLevel(collaborator.permissions || []);
        return nextAccessLevel === currentAccessLevel
          ? null
          : {
            uid: collaborator.uid,
            permissions: accessLevelToPermissions(nextAccessLevel)
          };
      })
      .filter(Boolean);

    setSaving(true);
    setLocalError('');
    try {
      await onSaveCollaboratorChanges({
        invitations: invitesToCreate,
        canceledInvitationIds: Array.from(canceledInvitationIds),
        permissionUpdates,
        removals: Array.from(removedUids)
      });
      toggleCollaborators();
    } catch (err) {
      setLocalError(getCollaboratorErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const collaboratorModal = showCollaborators ? (
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

        {localError && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {localError}
          </p>
        )}

        {collaborators.length > 0 ? (
          <ul className="soft-scrollbar mb-4 max-h-[280px] space-y-2 overflow-auto pr-1">
            {collaborators.map(collaborator => {
              const isOwner = collaborator.uid === ownerUid;
              const isRemoved = removedUids.has(collaborator.uid);
              const canRemoveThisCollaborator = !isOwner && (
                canRemoveCollaborator || collaborator.uid === currentUserUid
              );

              return (
                <li
                  key={collaborator.uid}
                  className={`flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-xs transition sm:text-sm ${isRemoved ? 'opacity-60' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold text-slate-900 ${isRemoved ? 'line-through' : ''}`}>
                      {getUserDisplayLabel(collaborator)}
                    </div>
                    {isOwner ? (
                      <div className="mt-2 inline-flex rounded-full bg-slate-950 px-2 py-1 text-xs font-semibold text-white">
                        Owner
                      </div>
                    ) : (
                      <select
                        value={draftAccessLevels[collaborator.uid] || 'read'}
                        onChange={event =>
                          setDraftAccessLevels(currentLevels => ({
                            ...currentLevels,
                            [collaborator.uid]: event.target.value
                          }))
                        }
                        disabled={!canManagePermissions || isRemoved}
                        className="select-field mt-2"
                      >
                        {ACCESS_LEVELS.map(level => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {canRemoveThisCollaborator && (
                    <button
                      onClick={() => toggleRemoval(collaborator.uid)}
                      className={isRemoved ? 'secondary-button px-3 py-2 text-xs' : 'danger-button px-3 py-2 text-xs'}
                      title={isRemoved ? 'Undo removal' : 'Remove collaborator'}
                    >
                      {isRemoved ? 'Undo' : collaborator.uid === currentUserUid ? 'Leave' : 'Remove'}
                    </button>
                  )}
                </li>
              );
            })}
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
              {pendingInvitations.map(invitation => {
                const isCanceled = canceledInvitationIds.has(invitation._id);

                return (
                  <li
                    key={invitation._id || invitation.email}
                    className={`flex items-start justify-between gap-3 rounded-xl bg-white/75 px-3 py-2 text-sm transition ${isCanceled ? 'opacity-60' : ''}`}
                  >
                    <div>
                      <div className={`font-semibold text-slate-900 ${isCanceled ? 'line-through' : ''}`}>
                        {invitation.email}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {accessLevelMap[permissionsToAccessLevel(invitation.permissions || [])].label}
                      </div>
                    </div>
                    {canInvite && invitation._id ? (
                      <button
                        type="button"
                        onClick={() => togglePendingInvitationCancellation(invitation._id)}
                        className={isCanceled ? 'secondary-button px-3 py-2 text-xs' : 'danger-button px-3 py-2 text-xs'}
                      >
                        {isCanceled ? 'Undo' : 'Cancel'}
                      </button>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                        Pending
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {stagedInvites.length > 0 && (
          <div className="mb-4 rounded-2xl bg-emerald-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-emerald-700">
              Staged invitations
            </div>
            <ul className="space-y-2">
              {stagedInvites.map(invite => (
                <li
                  key={invite.email}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/75 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{invite.email}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {accessLevelMap[invite.accessLevel].label}
                    </div>
                  </div>
                  <button
                    onClick={() => removeStagedInvite(invite.email)}
                    className="secondary-button px-3 py-2 text-xs"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canInvite && (
          <form noValidate onSubmit={stageInvite} className="mb-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              inputMode="email"
              autoComplete="email"
              value={inviteEmail}
              onChange={event => setInviteEmail(event.target.value)}
              placeholder="Invite by email"
              className="field flex-1"
            />
            <select
              value={inviteAccessLevel}
              onChange={event => setInviteAccessLevel(event.target.value)}
              className="select-field"
            >
              {ACCESS_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
            <button type="submit" className="secondary-button">
              Add Invite
            </button>
          </form>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={toggleCollaborators}
            className="secondary-button"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="primary-button"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={toggleCollaborators}
        className="secondary-button px-3 py-2 text-xs"
      >
        Collaborators
      </button>
      {collaboratorModal && createPortal(collaboratorModal, document.body)}
    </>
  );
}
