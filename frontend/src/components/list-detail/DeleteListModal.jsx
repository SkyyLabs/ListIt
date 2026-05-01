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
      onClick={event => {
        if (event.target === event.currentTarget && window.innerWidth >= 640) {
          onCancel();
        }
      }}
    >
      <div
        className="modal-panel max-w-sm"
        onPointerDown={e => e.stopPropagation()}
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
        <div className="modal-actions justify-end">
          <button
            onClick={onCancel}
            className="secondary-button w-full sm:w-auto"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="danger-button w-full sm:w-auto"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
