// frontend/src/components/ListView.js
import React, { useState, useEffect, useRef } from 'react';
import NewListModal from './NewListModal';
import ListDetail from './ListDetail';
import CategoryManager from './CategoryManager';
import { DEFAULT_SHOW_PUBLIC } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { fetchCategories } from '../services/categoryService';
import { fetchLists } from '../services/listService';
import { getVisibleLists } from '../utils/listVisibility';
import {
  fetchPreferences,
  updatePreferences
} from '../services/preferenceService';

export default function ListView({ user }) {
  const [lists, setLists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showPublic, setShowPublic] = useState(DEFAULT_SHOW_PUBLIC);
  const [showNewList, setShowNewList] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const isMountedRef = useRef(true);
  const preferenceRequestRef = useRef(0);
  const { isAdmin } = useAuth();

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load categories once
  useEffect(() => {
    let cancelled = false;

    fetchCategories()
      .then(nextCategories => {
        if (!cancelled) {
          setCategories(nextCategories);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error(err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load lists whenever filter or user changes
  useEffect(() => {
    let cancelled = false;
    const params = {};
    if (categoryFilter) params.categoryId = categoryFilter;
    fetchLists(params)
      .then(nextLists => {
        if (!cancelled) {
          setLists(nextLists);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error(err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [categoryFilter, user]);

  // Load persisted "showPublic" preference from DB
  useEffect(() => {
    let cancelled = false;

    if (user) {
      fetchPreferences()
        .then(pref => {
          if (!cancelled) {
            setShowPublic(pref.showPublic);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setShowPublic(DEFAULT_SHOW_PUBLIC);
          }
        });
    } else {
      setShowPublic(DEFAULT_SHOW_PUBLIC);
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Persist "showPublic" toggle to DB
  const handleShowPublicChange = e => {
    const val = e.target.checked;
    const prevVal = showPublic;
    setShowPublic(val);
    if (user) {
      const requestId = preferenceRequestRef.current + 1;
      preferenceRequestRef.current = requestId;
      updatePreferences({ showPublic: val })
        .catch(err => {
          if (isMountedRef.current && preferenceRequestRef.current === requestId) {
            setShowPublic(prevVal);
          }
          console.error(err);
        });
    }
  };

  // Ensure NewListModal is closed when adding an item
  const handleStartAddItem = () => {
    setShowNewList(false);
  };

  // The API returns all lists visible to the current request. This client-side
  // pass applies the user's personal "Show Public" preference on top of that.
  const visible = getVisibleLists(lists, user, showPublic);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {user && (
          <button
            onClick={() => setShowNewList(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition"
          >
            + New List
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setShowCatManager(v => !v)}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition"
          >
            {showCatManager ? 'Hide Categories' : 'Manage Categories'}
          </button>
        )}

        {user && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showPublic}
              onChange={handleShowPublicChange}
              className="h-4 w-4"
            />
            Show Public
          </label>
        )}

        <label className="flex items-center gap-2 text-sm">
          Category:
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="ml-1 border px-2 py-1 rounded-md text-sm"
          >
            <option value="">All</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isAdmin && showCatManager && (
        <CategoryManager
          categories={categories}
          setCategories={setCategories}
          user={user}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {visible.map(list => (
          <ListDetail
            key={list._id}
            list={list}
            user={user}
            onDelete={id => setLists(prev => prev.filter(l => l._id !== id))}
            onStartAddItem={handleStartAddItem}
          />
        ))}
      </div>

      {showNewList && (
        <NewListModal
          categories={categories}
          onCreated={list => setLists(prev => [list, ...prev])}
          onClose={() => setShowNewList(false)}
        />
      )}
    </>
  );
}
