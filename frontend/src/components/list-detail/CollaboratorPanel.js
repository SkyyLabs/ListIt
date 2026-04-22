import React from 'react';

export default function CollaboratorPanel({
  collaborators,
  disabled,
  inviteEmail,
  isOwner,
  onInvite,
  onInviteEmailChange,
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
                  className="flex items-center justify-between text-xs sm:text-sm"
                >
                  <span>
                    {collaborator.displayName ||
                      collaborator.email?.split('@')[0] ||
                      collaborator.uid}
                  </span>
                  {isOwner && collaborator.uid !== ownerUid && (
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
          {isOwner && (
            <form onSubmit={onInvite} className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => onInviteEmailChange(e.target.value)}
                placeholder="Invite by email"
                disabled={disabled}
                className="flex-1 border rounded px-2 py-1 text-xs sm:text-sm"
                required
              />
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
