// frontend/src/components/NewListModal.js
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DEFAULT_CATEGORY_NAME, DEFAULT_SHOW_PUBLIC } from '../config/constants';
import { createList } from '../api';
import InlineError from './InlineError';

export default function NewListModal({
  categories = [],
  onCreated,
  onClose
}) {
  const [title, setTitle]               = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [isPublic, setIsPublic]         = useState(DEFAULT_SHOW_PUBLIC);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError]               = useState('');
  const wrapperRef = useRef(null);

  const filteredCats = useMemo(() => {
    const sortedCats = [...categories].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
    const q = categoryName.trim().toLowerCase();
    return q
      ? sortedCats.filter(cat => cat.name.toLowerCase().includes(q))
      : sortedCats;
  }, [categories, categoryName]);

  // Close suggestions on any mousedown outside the wrapper
  useEffect(() => {
    const handleClickOutside = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectCat = name => {
    setCategoryName(name);
    setShowSuggestions(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setError('List title is required.');
      return;
    }
    setError('');
    const catName = categoryName.trim() || undefined;
    try {
      const payload = { title: t, categoryName: catName, isPublic };
      const list = await createList(payload);
      onCreated(list, { categoryName: catName || DEFAULT_CATEGORY_NAME });
    } catch (err) {
      console.error('Error creating list:', err);
      setError(err.response?.data || err.message);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="modal-panel max-w-md space-y-4"
      >
        <h2 className="text-2xl font-semibold text-slate-950">New List</h2>
        <InlineError message={error} />

        <input
          type="text"
          className="field"
          placeholder="List Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />

        <div className="relative" ref={wrapperRef}>
          <label className="block text-sm font-medium mb-1">
            Category (optional)
          </label>
          <input
            type="text"
            className="field"
            placeholder="Type to Search or Add New"
            value={categoryName}
            onChange={e => {
              setCategoryName(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
          />
          {showSuggestions && (
            <ul className="absolute z-10 mt-2 max-h-44 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
              {filteredCats.length > 0 ? (
                filteredCats.map(cat => (
                  <li
                    key={cat._id}
                    onClick={() => handleSelectCat(cat.name)}
                    className="cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {cat.name}
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
              )}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-500">
            {`Leave blank for "${DEFAULT_CATEGORY_NAME}"`}
          </p>
        </div>

        <label className="toggle-label w-fit">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={e => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Public
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="secondary-button"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
