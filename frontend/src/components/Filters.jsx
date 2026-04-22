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
    <div className="mb-4 flex gap-3">
      <div className="relative" ref={sortRef}>
        <button
          onClick={() => setSortOpen(open => !open)}
          className="rounded bg-gray-200 px-3 py-1 text-sm"
        >
          Sort
        </button>
        {sortOpen && (
          <div className="absolute left-0 top-full z-20 mt-2 w-40 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
            <button
              onClick={() => {
                onSortModeChange?.('subcategory');
                setSortOpen(false);
              }}
              className={`block w-full rounded px-2 py-2 text-left text-sm ${
                sortMode === 'subcategory' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
              }`}
            >
              Subcategory
            </button>
            <button
              onClick={() => {
                onSortModeChange?.('name');
                setSortOpen(false);
              }}
              className={`mt-1 block w-full rounded px-2 py-2 text-left text-sm ${
                sortMode === 'name' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
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
          className="rounded bg-gray-200 px-3 py-1 text-sm"
        >
          Filters
        </button>
        {filtersOpen && (
          <div className="absolute left-0 top-full z-20 mt-2 flex rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="min-w-[170px] border-r border-gray-200 p-2">
              {filterGroups.map(group => (
                <button
                  key={group.key}
                  onMouseEnter={() => setActivePane(group.key)}
                  onFocus={() => setActivePane(group.key)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                    activePane === group.key ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  <span>{group.label}</span>
                  {group.active && (
                    <span className={`text-xs ${activePane === group.key ? 'text-gray-200' : 'text-gray-500'}`}>
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="soft-scrollbar min-h-[220px] w-[240px] max-h-[260px] overflow-auto p-3">
              {activePane === 'subCategory' && (
                <>
                  <button
                    onClick={() => clearField('subCategory')}
                    className="mb-2 text-xs text-blue-500"
                  >
                    All Subcategories
                  </button>
                  {subCategories.map(subCategory => (
                    <label
                      key={subCategory}
                      className="mb-1 flex items-center rounded px-1 py-1 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={filters.subCategory.includes(subCategory)}
                        onChange={() => toggleItem('subCategory', subCategory)}
                        className="mr-2"
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
                    className="mb-2 text-xs text-blue-500"
                  >
                    All Users
                  </button>
                  {sortedCollaborators.map(collaborator => (
                    <label
                      key={collaborator.uid}
                      className="mb-1 flex items-center rounded px-1 py-1 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={filters.addedBy.includes(collaborator.uid)}
                        onChange={() => toggleItem('addedBy', collaborator.uid)}
                        className="mr-2"
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
                    className={`block w-full rounded px-2 py-2 text-left text-sm ${
                      filters.done === undefined ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatus('done')}
                    className={`mt-1 block w-full rounded px-2 py-2 text-left text-sm ${
                      filters.done === true ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    Done
                  </button>
                  <button
                    onClick={() => setStatus('notdone')}
                    className={`mt-1 block w-full rounded px-2 py-2 text-left text-sm ${
                      filters.done === false ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
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
