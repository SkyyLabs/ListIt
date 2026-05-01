import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createItem } from '../services/itemService';
import InlineError from './InlineError';

export default function NewListItemsModal({
  list,
  subCategories = [],
  onFinish
}) {
  const [text, setText] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [addedItems, setAddedItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const wrapperRef = useRef(null);

  const sortedSubCategories = useMemo(
    () => [...subCategories].sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' })
    ),
    [subCategories]
  );

  useEffect(() => {
    const query = subCategory.trim().toLowerCase();
    setFiltered(
      query
        ? sortedSubCategories.filter(value => value.toLowerCase().includes(query))
        : sortedSubCategories
    );
  }, [subCategory, sortedSubCategories]);

  useEffect(() => {
    const handler = event => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddItem = async event => {
    event.preventDefault();
    const nextText = text.trim();
    if (!nextText) {
      setError('Item text is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const item = await createItem(list._id, {
        text: nextText,
        subCategory: subCategory.trim() || undefined
      });
      setAddedItems(currentItems => [...currentItems, item]);
      setText('');
      setSubCategory('');
      setShowSuggestions(false);
    } catch (err) {
      setError(err.response?.data || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSuggestionPointerDown = (event, value) => {
    event.preventDefault();
    setSubCategory(value);
    setShowSuggestions(false);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={event => {
        if (event.target === event.currentTarget && window.innerWidth >= 640) {
          onFinish(addedItems);
        }
      }}
    >
      <form
        onPointerDown={event => event.stopPropagation()}
        onClick={event => event.stopPropagation()}
        onSubmit={handleAddItem}
        className="modal-panel max-w-lg space-y-4"
      >
        <div>
          <div className="chip mb-3">New list created</div>
          <h2 className="text-2xl font-semibold text-slate-950">
            Add items to {list.title}
          </h2>
        </div>

        <InlineError message={error} />

        <input
          type="text"
          className="field"
          placeholder="Item text"
          value={text}
          onChange={event => setText(event.target.value)}
        />

        <div className="relative" ref={wrapperRef}>
          <label className="mb-1 block text-sm font-medium">
            Sub-category (optional)
          </label>
          <input
            type="text"
            className="field"
            placeholder="Type or select"
            value={subCategory}
            onChange={event => {
              setSubCategory(event.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
          />
          {showSuggestions && (
            <ul className="absolute z-10 mt-2 max-h-44 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
              {filtered.length > 0 ? (
                filtered.map(value => (
                  <li
                    key={value}
                    onMouseDown={event => handleSuggestionPointerDown(event, value)}
                    onPointerDown={event => handleSuggestionPointerDown(event, value)}
                    className="cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {value}
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
              )}
            </ul>
          )}
        </div>

        {addedItems.length > 0 && (
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Added items
            </div>
            <ul className="max-h-36 space-y-2 overflow-auto">
              {addedItems.map(item => (
                <li key={item._id} className="flex flex-col gap-2 rounded-xl bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="break-words font-semibold text-slate-800">{item.text}</span>
                  <span className="w-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                    {item.subCategory}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="modal-actions justify-between">
          <button
            type="button"
            onClick={() => onFinish(addedItems)}
            className="secondary-button w-full sm:w-auto"
          >
            {addedItems.length > 0 ? 'Done' : 'Skip'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="primary-button w-full sm:w-auto"
          >
            {saving ? 'Adding…' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  );
}
