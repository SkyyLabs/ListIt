// frontend/src/components/NewItemModal.js
import React, { useState, useEffect, useRef } from 'react';
import { createItem } from '../services/itemService';
import InlineError from './InlineError';

export default function NewItemModal({
  draft = false,
  listId,
  subCategories = [],
  onCreated,
  onClose
}) {
  const [text, setText]               = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [filtered, setFiltered]       = useState([]);
  const [showSug, setShowSug]         = useState(false);
  const [error, setError]             = useState('');
  const wrapperRef = useRef(null);

  // Sort subCategories alphabetically
  const sorted = [...subCategories].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  // Update suggestions as user types
  useEffect(() => {
    const q = subCategory.trim().toLowerCase();
    setFiltered(
      q
        ? sorted.filter(sc => sc.toLowerCase().includes(q))
        : sorted
    );
  }, [subCategory, sorted]);

  // Close suggestions on mousedown outside
  useEffect(() => {
    const handler = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSug(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = val => {
    setSubCategory(val);
    setShowSug(false);
  };

  const handleSuggestionPointerDown = (event, val) => {
    event.preventDefault();
    handleSelect(val);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Item text is required.');
      return;
    }
    setError('');
    const payload = {
      text: text.trim(),
      subCategory: subCategory.trim() || undefined
    };
    if (draft) {
      // just add to draft
      onCreated({ _id: `temp_${Date.now()}`, ...payload, addedBy: null, done: false });
    } else {
      try {
        const item = await createItem(listId, payload);
        onCreated(item);
      } catch (err) {
        setError(err.response?.data || err.message);
        return;
      }
    }
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={event => {
        if (event.target === event.currentTarget && window.innerWidth >= 640) {
          onClose();
        }
      }}
    >
      <form
        onPointerDown={event => event.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="modal-panel max-w-md space-y-4"
      >
        <h2 className="text-2xl font-semibold text-slate-950">New Item</h2>
        <InlineError message={error} />

        <input
          type="text"
          className="field"
          placeholder="Item text"
          value={text}
          onChange={e => setText(e.target.value)}
          required
        />

        <div className="relative" ref={wrapperRef}>
          <label className="block text-sm font-medium mb-1">
            Sub-category (optional)
          </label>
          <input
            type="text"
            className="field"
            placeholder="Type or select"
            value={subCategory}
            onChange={e => {
              setSubCategory(e.target.value);
              setShowSug(true);
            }}
            onFocus={() => setShowSug(true)}
          />
          {showSug && (
            <ul className="absolute z-10 mt-2 max-h-44 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
              {filtered.length > 0 ? (
                filtered.map(sc => (
                  <li
                    key={sc}
                    onMouseDown={event => handleSuggestionPointerDown(event, sc)}
                    onPointerDown={event => handleSuggestionPointerDown(event, sc)}
                    className="cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {sc}
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
              )}
            </ul>
          )}
        </div>

        <div className="modal-actions justify-end">
          <button
            type="button"
            onClick={onClose}
            className="secondary-button w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button w-full sm:w-auto"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
