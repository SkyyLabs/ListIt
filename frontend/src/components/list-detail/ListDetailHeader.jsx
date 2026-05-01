import React from 'react';

export default function ListDetailHeader({
  canEdit,
  categoryName,
  editMode,
  hasTopRightAction = false,
  ownerLabel,
  onCancelEdit,
  onEnterEditMode,
  onSaveEdit,
  saving,
  source,
  title
}) {
  return (
    <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
      <div className={`min-w-0 ${hasTopRightAction ? 'pr-24 sm:pr-28' : 'pr-0 sm:pr-6'}`}>
        <h3 className="break-words text-2xl font-semibold leading-tight text-slate-950">
          {title}
        </h3>
        <div className="mt-2 inline-flex rounded-full bg-white/55 px-3 py-1 text-xs font-semibold text-slate-600">
          {categoryName}
        </div>
        {ownerLabel && (
          <div className="mt-2 text-xs font-semibold text-slate-600">
            Created By: {ownerLabel}
          </div>
        )}
        {source && (
          <div className="mt-2 text-xs leading-5 text-slate-500">
            Based on <span className="font-medium">{source.title}</span>
            {source.owner && (
              <> by <span className="font-medium">{source.owner.displayName || source.owner.email || source.owner.uid}</span></>
            )}
          </div>
        )}
      </div>
      {canEdit &&
        (editMode ? (
          <div className="flex flex-shrink-0 gap-2">
            <button
              onClick={onSaveEdit}
              disabled={saving}
              className="primary-button px-4 py-2 text-xs"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onCancelEdit}
              disabled={saving}
              className="secondary-button px-4 py-2 text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={onEnterEditMode}
            className="secondary-button flex-shrink-0 px-4 py-2 text-xs"
          >
            Edit
          </button>
        ))}
    </div>
  );
}
