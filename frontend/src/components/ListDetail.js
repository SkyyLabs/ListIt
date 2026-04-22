// frontend/src/components/ListDetail.js
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Filters from './Filters';
import InlineError from './InlineError';
import NewItemModal from './NewItemModal';
import CollaboratorPanel from './list-detail/CollaboratorPanel';
import DeleteListModal from './list-detail/DeleteListModal';
import ListDetailHeader from './list-detail/ListDetailHeader';
import ListItems from './list-detail/ListItems';
import { NOTE_COLORS } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import {
  addCollaborator,
  removeCollaborator,
  removeList,
  updateList
} from '../services/listService';
import {
  fetchItems,
  removeItem,
  updateItemDone
} from '../services/itemService';

export default function ListDetail({ list, user, onDelete }) {
  // Live list & items state
  const [listState, setListState] = useState(list);
  const [allItems, setAllItems]   = useState([]);

  // Draft snapshots & staged removals
  const draftListRef    = useRef(null);
  const draftItemsRef   = useRef(null);
  const [itemsToRemove, setItemsToRemove] = useState(new Set());

  // Filters & what to display
  const [filters, setFilters]           = useState({ subCategory: [], addedBy: [], done: undefined });
  const [displayItems, setDisplayItems] = useState([]);

  // UI toggles
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [inviteEmail, setInviteEmail]             = useState('');
  const [showNewItem, setShowNewItem]             = useState(false);
  const [error, setError]                         = useState('');

  // Edit mode & saving
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving]     = useState(false);

  // Delete-list confirmation modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const isMountedRef = useRef(true);
  const { isAdmin } = useAuth();

  // Permissions setup
  const ownerUid = listState.owner?.uid ?? listState.ownerUid;
  const invited  = (listState.collaborators || []).map(c =>
    typeof c === 'string' ? { uid: c } : c
  );
  const collaborators = [{ uid: ownerUid, ...listState.owner }, ...invited];
  const collabUids    = collaborators.map(c => c.uid);

  const isOwner  = user?.uid === ownerUid;
  const isCollab = user && collabUids.includes(user.uid);

  const canEdit   = isOwner || isCollab;
  const canDelete = isOwner || (isAdmin && listState.isPublic);

  const color = NOTE_COLORS[listState._id.charCodeAt(0) % NOTE_COLORS.length];

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load items from server & snapshot
  useEffect(() => {
    let cancelled = false;

    fetchItems(listState._id)
      .then(items => {
        if (!cancelled) {
          setAllItems(items);
          draftItemsRef.current = items.slice();
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error(err);
          setError('Failed to load items.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [listState._id, user?.uid]);

  // Recompute displayItems on changes, excluding staged removals
  useEffect(() => {
    let arr = allItems.filter(i => !itemsToRemove.has(i._id));
    if (filters.subCategory.length)
      arr = arr.filter(i => filters.subCategory.includes(i.subCategory));
    if (filters.addedBy.length)
      arr = arr.filter(i => filters.addedBy.includes(i.addedBy));
    if (filters.done !== undefined)
      arr = arr.filter(i => i.done === filters.done);
    setDisplayItems(arr);
  }, [allItems, filters, itemsToRemove]);

  // Invite collaborator
  const handleInvite = async e => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setError('Enter collaborator email.');
      return;
    }
    try {
      const updatedList = await addCollaborator(listState._id, {
        email: inviteEmail.trim()
      });
      if (!isMountedRef.current) return;
      setListState(s => ({
        ...s,
        collaborators: updatedList.collaborators || s.collaborators
      }));
      setInviteEmail('');
      setError('');
    } catch (err) {
      setError(err.response?.data || err.message);
    }
  };

  // Remove collaborator
  const handleRemoveCollaborator = async uid => {
    try {
      const updatedList = await removeCollaborator(listState._id, uid);
      if (!isMountedRef.current) return;
      setListState(s => ({
        ...s,
        collaborators: updatedList.collaborators || s.collaborators
      }));
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data || err.message);
    }
  };

  // Edit mode is intentionally draft-like: we snapshot the current list/items
  // so cancel can restore the UI without another fetch.
  const enterEditMode = () => {
    draftListRef.current  = { ...listState };
    draftItemsRef.current = allItems.slice();
    setItemsToRemove(new Set());
    setEditMode(true);
  };

  // Cancel edit: restore snapshots
  const cancelEdit = () => {
    setListState(draftListRef.current);
    setAllItems(draftItemsRef.current);
    setItemsToRemove(new Set());
    setEditMode(false);
    setSaving(false);
  };

  // Persist destructive item removals first, then save list-level changes.
  const saveEdit = async () => {
    setSaving(true);
    try {
      const removedItemIds = new Set(itemsToRemove);
      if (itemsToRemove.size > 0) {
        await Promise.all(
          Array.from(itemsToRemove).map(id =>
            removeItem(id)
          )
        );
      }
      if (listState.isPublic !== draftListRef.current.isPublic) {
        const updatedList = await updateList(listState._id, {
          isPublic: listState.isPublic
        });
        if (!isMountedRef.current) return;
        setListState(s => ({ ...s, isPublic: updatedList.isPublic }));
      }
      if (!isMountedRef.current) return;
      const remainingItems = allItems.filter(item => !removedItemIds.has(item._id));
      setAllItems(remainingItems);
      draftItemsRef.current = remainingItems;
      draftListRef.current = { ...listState };
      setItemsToRemove(new Set());
      setEditMode(false);
      setError('');
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) {
        setError('Failed to save changes.');
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  // Removals are staged locally until save so edit mode behaves like a draft.
  const handleRemoveItem = id => {
    setItemsToRemove(s => new Set(s).add(id));
  };
  const handleUndoRemove = id => {
    setItemsToRemove(s => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  };

  // Delete-list modal controls
  const openConfirm = () => { setDeleteError(''); setShowConfirm(true); };
  const cancelDelete = () => { setShowConfirm(false); setDeleting(false); };
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await removeList(listState._id);
      if (!isMountedRef.current) return;
      setShowConfirm(false);
      onDelete(listState._id);
      setError('');
    } catch (e) {
      console.error(e);
      if (isMountedRef.current) {
        setDeleteError('Failed to delete.');
        setDeleting(false);
      }
    }
  };

  // Toggle public locally in editMode
  const handlePublicToggle = e => {
    setListState(s => ({ ...s, isPublic: e.target.checked }));
  };

  // New item creation
  const handleNewItemCreated = item => {
    setAllItems(a => [item, ...a]);
    setShowNewItem(false);
  };

  const handleToggleItemDone = async item => {
    const updatedItem = await updateItemDone(item._id, !item.done);
    setAllItems(items =>
      items.map(currentItem =>
        currentItem._id === item._id ? updatedItem : currentItem
      )
    );
  };

  const subCats = listState.categoryId?.subCategories || [];
  const canToggleItems = isOwner || collabUids.includes(user?.uid);

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-lg shadow-xl ${color} p-4 sm:p-6 md:p-8`}
      style={{ minHeight: '200px' }}
    >
      <InlineError message={error} className="mb-4" />

      {/* Delete List Button */}
      {canDelete && !editMode && (
        <button
          onClick={openConfirm}
          className="absolute top-2 right-2 text-red-600 text-lg sm:text-xl md:text-2xl p-1 sm:p-2"
          title="Delete List"
        >
          ×
        </button>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <DeleteListModal
          deleteError={deleteError}
          deleting={deleting}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}

      {/* Title + Edit Controls row */}
      <ListDetailHeader
        canEdit={canEdit}
        categoryName={listState.categoryId?.name}
        editMode={editMode}
        onCancelEdit={cancelEdit}
        onEnterEditMode={enterEditMode}
        onSaveEdit={saveEdit}
        saving={saving}
        title={listState.title}
      />

      {/* Filters */}
      {canEdit && !editMode && (
        <Filters
          subCategories={subCats}
          collaborators={collaborators}
          filters={filters}
          onChange={setFilters}
        />
      )}

      {/* Items */}
      <ListItems
        canToggleItems={canToggleItems}
        displayItems={displayItems}
        editMode={editMode}
        isOwner={isOwner}
        itemsToRemove={itemsToRemove}
        onRemoveItem={handleRemoveItem}
        onToggleDone={handleToggleItemDone}
        onUndoRemove={handleUndoRemove}
        user={user}
      />

      {/* Add Item */}
      {canEdit && editMode && (
        <button
          onClick={() => setShowNewItem(true)}
          className="w-full py-1 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm rounded-md transition mb-4"
        >
          + Add Item
        </button>
      )}

      {/* Collaborators */}
      {(isOwner || isCollab) && (
        <CollaboratorPanel
          collaborators={collaborators}
          disabled={editMode}
          inviteEmail={inviteEmail}
          isOwner={isOwner}
          onInvite={handleInvite}
          onInviteEmailChange={setInviteEmail}
          onRemoveCollaborator={handleRemoveCollaborator}
          ownerUid={ownerUid}
          showCollaborators={showCollaborators}
          toggleCollaborators={() => setShowCollaborators(value => !value)}
        />
      )}

      {/* Public Toggle */}
      {isOwner && (
        <label className="inline-flex items-center text-xs sm:text-sm mb-4">
          <input
            type="checkbox"
            checked={listState.isPublic}
            onChange={handlePublicToggle}
            disabled={!editMode}
            className="mr-2"
          />
          Public
        </label>
      )}

      {/* New Item Modal */}
      {showNewItem && (
        <NewItemModal
          listId={listState._id}
          subCategories={subCats}
          onCreated={handleNewItemCreated}
          onClose={() => setShowNewItem(false)}
        />
      )}
    </motion.div>
  );
}
