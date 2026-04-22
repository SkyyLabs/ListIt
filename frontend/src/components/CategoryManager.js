// frontend/src/components/CategoryManager.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import InlineError from './InlineError';
import {
  createCategory,
  removeCategory,
  renameCategory
} from '../services/categoryService';

export default function CategoryManager({ categories, setCategories, user }) {
  const { isAdmin } = useAuth();

  // for new‐category input
  const [newName, setNewName] = useState('');

  // existing edit state (your rename logic)
  const [editNames, setEditNames] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    // initialize editNames whenever categories change
    const names = {};
    categories.forEach(cat => {
      names[cat._id] = cat.name;
    });
    setEditNames(names);
  }, [categories]);

  // Create a new category
  const handleAdd = async () => {
    const nm = newName.trim();
    if (!nm) {
      setError('Enter a category name.');
      return;
    }
    try {
      const category = await createCategory(nm);
      setCategories([ ...categories, category ]);
      setNewName('');
      setError('');
    } catch (err) {
      setError(err.response?.data || err.message);
    }
  };

  // (Your existing rename & delete handlers go here — unchanged)

  return (
    <div className="my-4 p-4 border rounded bg-gray-50">
      <h3 className="font-medium mb-2">Manage Categories</h3>
      <InlineError message={error} className="mb-3" />

      {isAdmin && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="flex-1 border px-2 py-1 rounded"
            placeholder="New category name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <button
            onClick={handleAdd}
            className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Add
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {categories.map(cat => {
          const isOwner = user.uid === cat.ownerUid;
          const canRename = isOwner || isAdmin;

          return (
            <li key={cat._id} className="flex items-center gap-2">
              <input
                type="text"
                disabled={!canRename}
                value={editNames[cat._id] || ''}
                onChange={e =>
                  setEditNames(prev => ({ ...prev, [cat._id]: e.target.value }))
                }
                className="flex-1 border px-2 py-1 rounded"
              />
              {canRename && (
                <button
                  onClick={async () => {
                    const newVal = editNames[cat._id].trim();
                    if (!newVal) {
                      setError('Name cannot be blank.');
                      return;
                    }
                    try {
                      const updatedCategory = await renameCategory(cat._id, newVal);
                      setCategories(categories.map(c =>
                        c._id === cat._id ? updatedCategory : c
                      ));
                      setError('');
                    } catch (err) {
                      setError(err.response?.data || err.message);
                    }
                  }}
                  className="px-2 py-1 bg-green-300 rounded hover:bg-green-500 text-xs"
                >
                  Rename
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={async () => {
                    if (!window.confirm('Delete this category?')) return;
                    try {
                      await removeCategory(cat._id);
                      setCategories(categories.filter(c => c._id !== cat._id));
                      setError('');
                    } catch (err) {
                      setError(err.response?.data || err.message);
                    }
                  }}
                  className="px-2 py-1 bg-red-400 rounded hover:bg-red-600 text-xs"
                >
                  Delete
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
