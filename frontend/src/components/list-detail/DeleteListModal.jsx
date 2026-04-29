import React from 'react';

export default function DeleteListModal({
  deleteError,
  deleting,
  onCancel,
  onConfirm
}) {
  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
    >
      <div
        className="modal-panel max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="mb-3 text-xl font-semibold text-slate-950">
          Delete list?
        </h2>
        {deleteError && (
          <p className="mb-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {deleteError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="secondary-button"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="danger-button"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
