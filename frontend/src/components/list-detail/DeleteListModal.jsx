import React from 'react';

export default function DeleteListModal({
  deleteError,
  deleting,
  onCancel,
  onConfirm
}) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg p-4 sm:p-6 md:p-8 w-64 sm:w-72 md:w-96"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-4">
          Delete list?
        </h2>
        {deleteError && (
          <p className="text-xs sm:text-sm text-red-500 mb-2">
            {deleteError}
          </p>
        )}
        <div className="flex justify-end space-x-2 sm:space-x-3">
          <button
            onClick={onCancel}
            className="px-2 py-1 sm:px-3 sm:py-2 bg-gray-200 rounded hover:bg-gray-300 text-xs sm:text-sm"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-2 py-1 sm:px-3 sm:py-2 bg-red-600 text-white rounded hover:bg-red-700 text-xs sm:text-sm"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
