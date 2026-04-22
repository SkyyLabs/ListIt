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
import {
  COLLABORATOR_PERMISSIONS,
  NOTE_COLORS
} from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { normalizeCollaborator } from '../utils/listPermissions';
import {
  compareStrings,
  sortItems,
  sortUsers,
  uniqueSortedStrings
} from '../utils/sorting';
import {
  addCollaborator,
  removeCollaborator,
  removeList,
  updateCollaboratorPermissions,
  updateList,
  updateListReaction
} from '../services/listService';
import {
  fetchItems,
  removeItem,
  updateItem,
  updateItemDone
} from '../services/itemService';

export default function ListDetail({
  list,
  user,
  isPinned,
  itemSortMode,
  onDelete,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onItemSortModeChange,
  onListUpdate,
  onTogglePin
}) {
  // Live list & items state
  const [listState, setListState] = useState(list);
  const [allItems, setAllItems]   = useState([]);
  const [draftItems, setDraftItems] = useState({});

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
  const [invitePermissions, setInvitePermissions] = useState([
    COLLABORATOR_PERMISSIONS.READ
  ]);
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
  const invited = (listState.collaborators || [])
    .map(normalizeCollaborator)
    .filter(Boolean);
  const currentCollaborator = invited.find(collaborator => collaborator.uid === user?.uid);
  const collaborators = sortUsers([
    { uid: ownerUid, permissions: Object.values(COLLABORATOR_PERMISSIONS), ...listState.owner },
    ...invited
  ]);
  const collabUids = invited.map(collaborator => collaborator.uid);

  const isOwner  = user?.uid === ownerUid;
  const isCollab = Boolean(user && collabUids.includes(user.uid));

  const hasAddRemove = currentCollaborator?.permissions?.includes(
    COLLABORATOR_PERMISSIONS.ADD_REMOVE
  );
  const hasEditAll = currentCollaborator?.permissions?.includes(
    COLLABORATOR_PERMISSIONS.EDIT_ALL
  );

  const canEnterEditMode = isOwner || hasAddRemove || hasEditAll;
  const canManageItems = isOwner || hasAddRemove || hasEditAll;
  const canEditItemMetadata = isOwner || hasEditAll;
  const canInvite = isOwner || hasEditAll;
  const canManagePermissions = isOwner || hasEditAll;
  const canRemoveCollaborator = isOwner;
  const canDelete = isOwner || (isAdmin && listState.isPublic);
  const canToggleItems = isOwner || isCollab;

  const color = NOTE_COLORS[listState._id.charCodeAt(0) % NOTE_COLORS.length];

  useEffect(() => {
    setListState(list);
  }, [list]);

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
    let arr = allItems
      .map(item => ({
        ...item,
        ...(editMode ? draftItems[item._id] || {} : {})
      }))
      .filter(item => !itemsToRemove.has(item._id));
    if (filters.subCategory.length)
      arr = arr.filter(item => filters.subCategory.includes(item.subCategory));
    if (filters.addedBy.length)
      arr = arr.filter(item => filters.addedBy.includes(item.addedBy));
    if (filters.done !== undefined)
      arr = arr.filter(item => item.done === filters.done);
    setDisplayItems(sortItems(arr, itemSortMode));
  }, [allItems, draftItems, editMode, filters, itemSortMode, itemsToRemove]);

  // Invite collaborator
  const handleInvite = async e => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setError('Enter collaborator email.');
      return;
    }
    try {
      const updatedList = await addCollaborator(listState._id, {
        email: inviteEmail.trim(),
        permissions: invitePermissions
      });
      if (!isMountedRef.current) return;
      setListState(s => ({
        ...s,
        collaborators: updatedList.collaborators || s.collaborators
      }));
      onListUpdate?.(updatedList);
      setInviteEmail('');
      setInvitePermissions([COLLABORATOR_PERMISSIONS.READ]);
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
      onListUpdate?.(updatedList);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data || err.message);
    }
  };

  const handleInvitePermissionToggle = (permission, checked) => {
    if (permission === COLLABORATOR_PERMISSIONS.READ) {
      return;
    }

    setInvitePermissions(currentPermissions => {
      const withoutRead = currentPermissions.filter(
        currentPermission => currentPermission !== COLLABORATOR_PERMISSIONS.READ
      );
      const nextPermissions = checked
        ? [...withoutRead, permission]
        : withoutRead.filter(currentPermission => currentPermission !== permission);
      return [
        COLLABORATOR_PERMISSIONS.READ,
        ...nextPermissions.sort(compareStrings)
      ];
    });
  };

  const handlePermissionChange = async (uid, permission, checked) => {
    if (permission === COLLABORATOR_PERMISSIONS.READ) {
      return;
    }

    const collaborator = invited.find(entry => entry.uid === uid);
    if (!collaborator) {
      return;
    }

    const nextPermissions = [
      COLLABORATOR_PERMISSIONS.READ,
      ...(checked
        ? [...(collaborator.permissions || []), permission]
        : (collaborator.permissions || []).filter(
          currentPermission =>
            currentPermission !== permission
            && currentPermission !== COLLABORATOR_PERMISSIONS.READ
        ))
    ].filter((currentPermission, index, permissions) =>
      permissions.indexOf(currentPermission) === index
    );

    try {
      const updatedList = await updateCollaboratorPermissions(
        listState._id,
        uid,
        nextPermissions
      );
      if (!isMountedRef.current) return;
      setListState(s => ({
        ...s,
        collaborators: updatedList.collaborators || s.collaborators
      }));
      onListUpdate?.(updatedList);
      setError('');
    } catch (err) {
      setError(err.response?.data || err.message);
    }
  };

  // Edit mode is intentionally draft-like: we snapshot the current list/items
  // so cancel can restore the UI without another fetch.
  const enterEditMode = () => {
    draftListRef.current  = { ...listState };
    draftItemsRef.current = allItems.slice();
    setDraftItems(
      Object.fromEntries(
        allItems.map(item => [
          item._id,
          { text: item.text, subCategory: item.subCategory }
        ])
      )
    );
    setItemsToRemove(new Set());
    setEditMode(true);
  };

  // Cancel edit: restore snapshots
  const cancelEdit = () => {
    setListState(draftListRef.current);
    setAllItems(draftItemsRef.current);
    setDraftItems({});
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
      const changedItems = allItems
        .filter(item => !removedItemIds.has(item._id))
        .filter(item => {
          const draftItem = draftItems[item._id];
          return draftItem
            && (draftItem.text !== item.text || draftItem.subCategory !== item.subCategory);
        });
      if (changedItems.length > 0) {
        await Promise.all(
          changedItems.map(item =>
            updateItem(item._id, {
              text: draftItems[item._id].text,
              subCategory: draftItems[item._id].subCategory
            })
          )
        );
      }
      if (listState.isPublic !== draftListRef.current.isPublic) {
        const updatedList = await updateList(listState._id, {
          isPublic: listState.isPublic
        });
        if (!isMountedRef.current) return;
        setListState(s => ({ ...s, isPublic: updatedList.isPublic }));
        onListUpdate?.(updatedList);
      }
      if (!isMountedRef.current) return;
      const remainingItems = allItems
        .filter(item => !removedItemIds.has(item._id))
        .map(item => ({
          ...item,
          ...(draftItems[item._id] || {})
        }));
      setAllItems(remainingItems);
      draftItemsRef.current = remainingItems;
      draftListRef.current = { ...listState };
      setDraftItems(
        Object.fromEntries(
          remainingItems.map(item => [
            item._id,
            { text: item.text, subCategory: item.subCategory }
          ])
        )
      );
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

  const handleDraftItemChange = (itemId, field, value) => {
    setDraftItems(currentDraftItems => ({
      ...currentDraftItems,
      [itemId]: {
        ...(currentDraftItems[itemId] || {}),
        [field]: value
      }
    }));
  };

  const handleReactionChange = async nextReaction => {
    const normalizedReaction = listState.currentUserReaction === nextReaction
      ? null
      : nextReaction;

    try {
      const updatedList = await updateListReaction(listState._id, normalizedReaction);
      if (!isMountedRef.current) return;
      setListState(currentListState => ({ ...currentListState, ...updatedList }));
      onListUpdate?.(updatedList);
      setError('');
    } catch (err) {
      setError(err.response?.data || err.message);
    }
  };

  const availableSubCategories = uniqueSortedStrings(
    listState.categoryId?.subCategories || []
  );
  const filterSubCategories = uniqueSortedStrings(
    allItems
      .map(item => ({
        ...item,
        ...(editMode ? draftItems[item._id] || {} : {})
      }))
      .filter(item => !itemsToRemove.has(item._id))
      .map(item => item.subCategory)
  );

  return (
    <motion.div
      draggable={isPinned}
      layout
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-lg shadow-xl ${color} p-4 sm:p-6 md:p-8`}
      style={{ minHeight: '200px' }}
    >
      {isPinned && (
        <div className="absolute top-2 left-2 text-gray-500 text-lg" title="Drag pinned list">
          ::
        </div>
      )}

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
        canEdit={canEnterEditMode}
        categoryName={listState.categoryId?.name}
        editMode={editMode}
        onCancelEdit={cancelEdit}
        onEnterEditMode={enterEditMode}
        onSaveEdit={saveEdit}
        saving={saving}
        title={listState.title}
      />

      {/* Filters */}
      {!editMode && (
        <Filters
          collaborators={collaborators}
          filters={filters}
          onChange={setFilters}
          onSortModeChange={onItemSortModeChange}
          sortMode={itemSortMode}
          subCategories={filterSubCategories}
        />
      )}

      {/* Items */}
      <ListItems
        availableSubCategories={availableSubCategories}
        canEditItemMetadata={canEditItemMetadata}
        canRemoveItems={canManageItems}
        canToggleItems={canToggleItems}
        displayItems={displayItems}
        draftItems={draftItems}
        editMode={editMode}
        itemsToRemove={itemsToRemove}
        onDraftItemChange={handleDraftItemChange}
        onRemoveItem={handleRemoveItem}
        onToggleDone={handleToggleItemDone}
        onUndoRemove={handleUndoRemove}
        user={user}
      />

      {/* Add Item */}
      {canManageItems && editMode && (
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
          canInvite={canInvite}
          canManagePermissions={canManagePermissions}
          canRemoveCollaborator={canRemoveCollaborator}
          disabled={!editMode}
          inviteEmail={inviteEmail}
          invitePermissions={invitePermissions}
          onInvite={handleInvite}
          onInviteEmailChange={setInviteEmail}
          onInvitePermissionToggle={handleInvitePermissionToggle}
          onPermissionChange={handlePermissionChange}
          onRemoveCollaborator={handleRemoveCollaborator}
          ownerUid={ownerUid}
          showCollaborators={showCollaborators}
          toggleCollaborators={() => setShowCollaborators(value => !value)}
        />
      )}

      {/* Public Toggle */}
      {isOwner && editMode && (
        <label className="inline-flex items-center text-xs sm:text-sm mb-4">
          <input
            type="checkbox"
            checked={listState.isPublic}
            onChange={handlePublicToggle}
            className="mr-2"
          />
          Public
        </label>
      )}

      {/* New Item Modal */}
      {showNewItem && (
        <NewItemModal
          listId={listState._id}
          subCategories={availableSubCategories}
          onCreated={handleNewItemCreated}
          onClose={() => setShowNewItem(false)}
        />
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        {user && (
          <button
            onClick={onTogglePin}
            className="rounded border px-2 py-1 text-xs sm:text-sm"
          >
            {isPinned ? 'Unpin' : 'Pin'}
          </button>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs sm:text-sm">
          <button
            onClick={() => handleReactionChange('like')}
            disabled={!user}
            aria-label="Thumbs up"
            className={`rounded border px-2 py-1 ${listState.currentUserReaction === 'like' ? 'border-green-500 bg-green-200' : 'bg-white'}`}
          >
            👍 {listState.likesCount || 0}
          </button>
          <button
            onClick={() => handleReactionChange('dislike')}
            disabled={!user}
            aria-label="Thumbs down"
            className={`rounded border px-2 py-1 ${listState.currentUserReaction === 'dislike' ? 'border-red-500 bg-red-200' : 'bg-white'}`}
          >
            👎 {listState.dislikesCount || 0}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
