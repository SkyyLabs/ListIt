import React from 'react';

export default function ListDetailHeader({
  canEdit,
  categoryName,
  editMode,
  onCancelEdit,
  onEnterEditMode,
  onSaveEdit,
  saving,
  title
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="text-lg sm:text-xl md:text-2xl font-semibold">
          {title}
        </h3>
        <div className="text-xs sm:text-sm text-gray-600">
          Category: <span className="font-medium">{categoryName}</span>
        </div>
      </div>
      {canEdit &&
        (editMode ? (
          <div className="flex gap-2">
            <button
              onClick={onSaveEdit}
              disabled={saving}
              className="px-3 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs sm:text-sm"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onCancelEdit}
              disabled={saving}
              className="px-3 py-1 sm:px-4 sm:py-2 bg-gray-300 rounded hover:bg-gray-400 text-xs sm:text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={onEnterEditMode}
            className="px-2 py-1 sm:px-3 sm:py-2 bg-gray-200 rounded hover:bg-gray-300 text-xs sm:text-sm"
          >
            Edit
          </button>
        ))}
    </div>
  );
}
