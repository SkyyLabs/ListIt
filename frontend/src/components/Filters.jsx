import React, { useEffect, useRef, useState } from 'react';
import { sortUsers } from '../utils/sorting';

export default function Filters({
  subCategories = [],
  collaborators = [],
  filters = { subCategory: [], addedBy: [], done: undefined },
  onChange,
  sortMode = 'subcategory',
  onSortModeChange
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePane, setActivePane] = useState('subCategory');
  const sortRef = useRef(null);
  const filtersRef = useRef(null);

  useEffect(() => {
    const handleOutside = event => {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setFiltersOpen(false);
      }
    };

    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  const clearField = field => {
    onChange({ ...filters, [field]: [] });
  };

  const toggleItem = (field, value) => {
    const currentValues = filters[field] || [];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter(entry => entry !== value)
      : [...currentValues, value];
    onChange({ ...filters, [field]: nextValues });
  };

  const setStatus = value => {
    onChange({ ...filters, done: value === 'all' ? undefined : value === 'done' });
    setFiltersOpen(false);
  };

  const sortedCollaborators = sortUsers(collaborators);
  const filterGroups = [
    {
      key: 'subCategory',
      label: 'Subcategories',
      active: filters.subCategory.length > 0
    },
    {
      key: 'addedBy',
      label: 'Users',
      active: filters.addedBy.length > 0
    },
    {
      key: 'done',
      label: 'Status',
      active: filters.done !== undefined
    }
  ];

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <div className="relative" ref={sortRef}>
        <button
          onClick={() => setSortOpen(open => !open)}
          className="secondary-button px-3 py-2 text-xs"
        >
          Sort
        </button>
        {sortOpen && (
          <div className="absolute left-0 top-full z-20 mt-2 w-44 rounded-2xl border border-white/80 bg-white/95 p-2 shadow-2xl backdrop-blur">
            <button
              onClick={() => {
                onSortModeChange?.('subcategory');
                setSortOpen(false);
              }}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                sortMode === 'subcategory' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Subcategory
            </button>
            <button
              onClick={() => {
                onSortModeChange?.('name');
                setSortOpen(false);
              }}
              className={`mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                sortMode === 'name' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Name
            </button>
          </div>
        )}
      </div>

      <div className="relative" ref={filtersRef}>
        <button
          onClick={() => setFiltersOpen(open => !open)}
          className="secondary-button px-3 py-2 text-xs"
        >
          Filters
        </button>
        {filtersOpen && (
          <div className="absolute left-0 top-full z-20 mt-2 flex w-[min(calc(100vw-2rem),28rem)] flex-col rounded-2xl border border-white/80 bg-white/95 shadow-2xl backdrop-blur sm:w-auto sm:flex-row">
            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2 sm:block sm:min-w-[170px] sm:border-b-0 sm:border-r">
              {filterGroups.map(group => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActivePane(group.key)}
                  onMouseEnter={() => setActivePane(group.key)}
                  onFocus={() => setActivePane(group.key)}
                  className={`flex flex-shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold sm:w-full ${
                    activePane === group.key ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{group.label}</span>
                  {group.active && (
                    <span className={`text-xs ${activePane === group.key ? 'text-slate-200' : 'text-slate-400'}`}>
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="soft-scrollbar max-h-[260px] min-h-[180px] overflow-auto p-3 sm:min-h-[220px] sm:w-[240px]">
              {activePane === 'subCategory' && (
                <>
                  <button
                    onClick={() => clearField('subCategory')}
                    className="mb-2 text-xs font-semibold text-slate-500"
                  >
                    All Subcategories
                  </button>
                  {subCategories.map(subCategory => (
                    <label
                      key={subCategory}
                      className="mb-1 flex items-center rounded-xl px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={filters.subCategory.includes(subCategory)}
                        onChange={() => toggleItem('subCategory', subCategory)}
                        className="mr-2 h-4 w-4 rounded border-slate-300"
                      />
                      {subCategory}
                    </label>
                  ))}
                </>
              )}

              {activePane === 'addedBy' && (
                <>
                  <button
                    onClick={() => clearField('addedBy')}
                    className="mb-2 text-xs font-semibold text-slate-500"
                  >
                    All Users
                  </button>
                  {sortedCollaborators.map(collaborator => (
                    <label
                      key={collaborator.uid}
                      className="mb-1 flex items-center rounded-xl px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={filters.addedBy.includes(collaborator.uid)}
                        onChange={() => toggleItem('addedBy', collaborator.uid)}
                        className="mr-2 h-4 w-4 rounded border-slate-300"
                      />
                      {collaborator.displayName || collaborator.uid}
                    </label>
                  ))}
                </>
              )}

              {activePane === 'done' && (
                <>
                  <button
                    onClick={() => setStatus('all')}
                    className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                      filters.done === undefined ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatus('done')}
                    className={`mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                      filters.done === true ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Done
                  </button>
                  <button
                    onClick={() => setStatus('notdone')}
                    className={`mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                      filters.done === false ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Not Done
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
