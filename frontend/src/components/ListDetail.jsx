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
  getUserDisplayLabel,
  sortItems,
  sortUsers,
  uniqueSortedStrings
} from '../utils/sorting';
import {
  cancelCollaboratorInvitation,
  createCollaboratorInvitation,
  duplicateList,
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
  const [showNewItem, setShowNewItem]             = useState(false);
  const [error, setError]                         = useState('');
  const [dragging, setDragging]                   = useState(false);

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
  const canRemoveCollaborator = isOwner || hasEditAll;
  const canDelete = isOwner || (isAdmin && listState.isPublic);
  const canToggleItems = isOwner || isCollab;
  const canDuplicate = Boolean(user && (listState.isPublic || isOwner || isCollab));
  const ownerLabel = getUserDisplayLabel(listState.owner) || ownerUid;

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

  const handleSaveCollaboratorChanges = async ({
    invitations = [],
    canceledInvitationIds = [],
    permissionUpdates = [],
    removals = []
  }) => {
    const removedUidSet = new Set(removals);
    let nextCollaborators = listState.collaborators || [];
    let nextPendingInvitations = listState.pendingInvitations || [];

    for (const uid of removals) {
      const updatedList = await removeCollaborator(listState._id, uid);
      nextCollaborators = updatedList.collaborators || nextCollaborators;
    }

    for (const update of permissionUpdates) {
      if (removedUidSet.has(update.uid)) {
        continue;
      }
      const updatedList = await updateCollaboratorPermissions(
        listState._id,
        update.uid,
        update.permissions
      );
      nextCollaborators = updatedList.collaborators || nextCollaborators;
    }

    for (const invitationId of canceledInvitationIds) {
      await cancelCollaboratorInvitation(listState._id, invitationId);
      nextPendingInvitations = nextPendingInvitations.filter(
        invitation => invitation._id !== invitationId
      );
    }

    for (const invitationPayload of invitations) {
      const invitation = await createCollaboratorInvitation(listState._id, {
        email: invitationPayload.email,
        permissions: invitationPayload.permissions
      });
      nextPendingInvitations = [
        invitation,
        ...nextPendingInvitations.filter(
          existingInvitation => existingInvitation.email !== invitation.email
        )
      ];
    }

    if (!isMountedRef.current) {
      return;
    }

    const updatedListState = {
      ...listState,
      collaborators: nextCollaborators,
      pendingInvitations: nextPendingInvitations
    };
    setListState(updatedListState);
    onListUpdate?.(updatedListState);
    setError('');
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

  const handleDuplicate = async () => {
    try {
      const duplicatedList = await duplicateList(listState._id);
      onListUpdate?.(duplicatedList, { prepend: true });
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
      onDragEnd={event => {
        setDragging(false);
        onDragEnd?.(event);
      }}
      onDragOver={onDragOver}
      onDragStart={event => {
        setDragging(true);
        onDragStart?.(event);
      }}
      onDrop={onDrop}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      className={`relative flex min-h-[460px] flex-col overflow-hidden rounded-[30px] border border-white/80 ${color} p-5 shadow-[0_22px_70px_-45px_rgba(15,23,42,0.7)] sm:p-6 ${isPinned ? dragging ? 'cursor-grabbing' : 'cursor-grab' : ''}`}
    >
      {isPinned && (
        <div
          className={`absolute left-0 top-0 z-10 grid h-[30px] w-[30px] grid-cols-3 place-items-center gap-0.5 bg-white/60 p-2 text-slate-500 shadow-sm [clip-path:polygon(0_0,100%_0,0_100%)] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          title="Drag pinned list"
        >
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className="h-0.5 w-0.5 rounded-full bg-current" />
          ))}
        </div>
      )}

      <InlineError message={error} className="mb-4" />

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
        ownerLabel={ownerLabel}
        onCancelEdit={cancelEdit}
        onEnterEditMode={enterEditMode}
        onSaveEdit={saveEdit}
        saving={saving}
        source={listState.source}
        title={listState.title}
      />

      <div className="flex-1">
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

        {canManageItems && editMode && (
          <button
            onClick={() => setShowNewItem(true)}
            className="primary-button mb-4 w-full"
          >
            + Add Item
          </button>
        )}

        {isOwner && editMode && (
          <label className="toggle-label mb-4">
            <input
              type="checkbox"
              checked={listState.isPublic}
              onChange={handlePublicToggle}
              className="h-4 w-4 rounded border-slate-300"
            />
            Public
          </label>
        )}
      </div>

      {/* New Item Modal */}
      {showNewItem && (
        <NewItemModal
          listId={listState._id}
          subCategories={availableSubCategories}
          onCreated={handleNewItemCreated}
          onClose={() => setShowNewItem(false)}
        />
      )}

      {(isOwner || isCollab) && (
        <div className="mb-4">
          <CollaboratorPanel
            collaborators={collaborators}
            pendingInvitations={listState.pendingInvitations || []}
            canInvite={canInvite}
            canManagePermissions={canManagePermissions}
            canRemoveCollaborator={canRemoveCollaborator}
            currentUserUid={user?.uid}
            onSaveCollaboratorChanges={handleSaveCollaboratorChanges}
            ownerUid={ownerUid}
            showCollaborators={showCollaborators}
            toggleCollaborators={() => setShowCollaborators(value => !value)}
          />
        </div>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="flex items-center gap-2">
          {user && !editMode && (
            <button
              onClick={onTogglePin}
              aria-label={isPinned ? 'Unpin list' : 'Pin list'}
              className={`rounded-full border px-3 py-2 text-xs font-semibold leading-none shadow-sm transition hover:-translate-y-0.5 ${
                isPinned
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-white bg-white/75 text-slate-700'
              }`}
            >
              {isPinned ? 'Pinned' : 'Pin'}
            </button>
          )}
          {canDuplicate && (
            <button
              onClick={handleDuplicate}
              className="rounded-full border border-white bg-white/75 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
            >
              Duplicate
            </button>
          )}
        </div>
        {editMode ? (
          canDelete && (
            <button
              onClick={openConfirm}
              className="danger-button ml-auto px-4 py-2 text-xs"
            >
              Delete
            </button>
          )
        ) : (
          <div className="ml-auto flex items-center gap-2 text-xs sm:text-sm">
            <button
              onClick={() => handleReactionChange('like')}
              disabled={!user}
              aria-label="Thumbs up"
              className={`rounded-full border px-3 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50 ${listState.currentUserReaction === 'like' ? 'border-emerald-500 bg-emerald-100 text-emerald-800' : 'border-white bg-white/75 text-slate-700'}`}
            >
              Up {listState.likesCount || 0}
            </button>
            <button
              onClick={() => handleReactionChange('dislike')}
              disabled={!user}
              aria-label="Thumbs down"
              className={`rounded-full border px-3 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50 ${listState.currentUserReaction === 'dislike' ? 'border-rose-500 bg-rose-100 text-rose-800' : 'border-white bg-white/75 text-slate-700'}`}
            >
              Down {listState.dislikesCount || 0}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
