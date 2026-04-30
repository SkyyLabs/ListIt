// frontend/src/components/ListView.js
import React, { useState, useEffect, useRef } from 'react';
import NewListModal from './NewListModal';
import NewListItemsModal from './NewListItemsModal';
import ListDetail from './ListDetail';
import CategoryManager from './CategoryManager';
import {
  DEFAULT_ITEM_SORT_MODE,
  DEFAULT_SHOW_PINNED_ONLY
} from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchCategories,
  fetchLists,
  fetchPreferences,
  updatePreferences
} from '../api';
import { compareStrings } from '../utils/sorting';

export default function ListView({ user, viewMode = 'home' }) {
  const [lists, setLists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(DEFAULT_SHOW_PINNED_ONLY);
  const [itemSortMode, setItemSortMode] = useState(DEFAULT_ITEM_SORT_MODE);
  const [pinnedListIds, setPinnedListIds] = useState([]);
  const [pinnedListOrder, setPinnedListOrder] = useState([]);
  const [showNewList, setShowNewList] = useState(false);
  const [pendingNewList, setPendingNewList] = useState(null);
  const [showCatManager, setShowCatManager] = useState(false);
  const [draggedPinnedId, setDraggedPinnedId] = useState(null);
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

  // Load persisted list preferences from DB
  useEffect(() => {
    let cancelled = false;

    if (user) {
      fetchPreferences()
        .then(pref => {
          if (!cancelled) {
            setShowPinnedOnly(pref.showPinnedOnly || DEFAULT_SHOW_PINNED_ONLY);
            setItemSortMode(pref.itemSortMode || DEFAULT_ITEM_SORT_MODE);
            setPinnedListIds(pref.pinnedListIds || []);
            setPinnedListOrder(pref.pinnedListOrder || []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setShowPinnedOnly(DEFAULT_SHOW_PINNED_ONLY);
            setItemSortMode(DEFAULT_ITEM_SORT_MODE);
            setPinnedListIds([]);
            setPinnedListOrder([]);
          }
        });
    } else {
      setShowPinnedOnly(DEFAULT_SHOW_PINNED_ONLY);
      setItemSortMode(DEFAULT_ITEM_SORT_MODE);
      setPinnedListIds([]);
      setPinnedListOrder([]);
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  const persistPreferencePatch = async (nextPrefs, rollback) => {
    if (!user) {
      return;
    }

    const requestId = preferenceRequestRef.current + 1;
    preferenceRequestRef.current = requestId;
    try {
      await updatePreferences(nextPrefs);
    } catch (err) {
      if (isMountedRef.current && preferenceRequestRef.current === requestId) {
        rollback();
      }
      console.error(err);
    }
  };

  const handleShowPinnedOnlyChange = e => {
    const val = e.target.checked;
    const prevVal = showPinnedOnly;
    setShowPinnedOnly(val);
    persistPreferencePatch(
      { showPinnedOnly: val },
      () => setShowPinnedOnly(prevVal)
    );
  };

  const handleItemSortModeChange = nextSortMode => {
    const prevSortMode = itemSortMode;
    setItemSortMode(nextSortMode);
    persistPreferencePatch(
      { itemSortMode: nextSortMode },
      () => setItemSortMode(prevSortMode)
    );
  };

  const handleTogglePin = listId => {
    const isPinned = pinnedListIds.includes(listId);
    const nextPinnedListIds = isPinned
      ? pinnedListIds.filter(id => id !== listId)
      : [...pinnedListIds, listId];
    const nextPinnedListOrder = isPinned
      ? pinnedListOrder.filter(id => id !== listId)
      : [...pinnedListOrder.filter(id => id !== listId), listId];

    const prevPinnedListIds = pinnedListIds;
    const prevPinnedListOrder = pinnedListOrder;
    setPinnedListIds(nextPinnedListIds);
    setPinnedListOrder(nextPinnedListOrder);
    persistPreferencePatch(
      {
        pinnedListIds: nextPinnedListIds,
        pinnedListOrder: nextPinnedListOrder
      },
      () => {
        setPinnedListIds(prevPinnedListIds);
        setPinnedListOrder(prevPinnedListOrder);
      }
    );
  };

  const handleDelete = deletedListId => {
    const nextPinnedListIds = pinnedListIds.filter(id => id !== deletedListId);
    const nextPinnedListOrder = pinnedListOrder.filter(id => id !== deletedListId);
    setLists(prev => prev.filter(list => list._id !== deletedListId));
    setPinnedListIds(nextPinnedListIds);
    setPinnedListOrder(nextPinnedListOrder);
    if (user && (nextPinnedListIds.length !== pinnedListIds.length
      || nextPinnedListOrder.length !== pinnedListOrder.length)) {
      updatePreferences({
        pinnedListIds: nextPinnedListIds,
        pinnedListOrder: nextPinnedListOrder
      }).catch(err => console.error(err));
    }
  };

  const handlePinnedDrop = targetListId => {
    if (!draggedPinnedId || draggedPinnedId === targetListId) {
      return;
    }

    const draggedIndex = pinnedListOrder.indexOf(draggedPinnedId);
    const targetIndex = pinnedListOrder.indexOf(targetListId);
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedPinnedId(null);
      return;
    }

    const nextOrder = pinnedListOrder.filter(id => id !== draggedPinnedId);
    const insertIndex = draggedIndex < targetIndex
      ? nextOrder.indexOf(targetListId) + 1
      : nextOrder.indexOf(targetListId);
    nextOrder.splice(insertIndex, 0, draggedPinnedId);

    const prevPinnedListOrder = pinnedListOrder;
    setPinnedListOrder(nextOrder);
    setDraggedPinnedId(null);
    persistPreferencePatch(
      { pinnedListOrder: nextOrder },
      () => setPinnedListOrder(prevPinnedListOrder)
    );
  };

  // Ensure NewListModal is closed when adding an item
  const handleStartAddItem = () => {
    setShowNewList(false);
  };

  const getListCategoryId = list => {
    if (!list?.categoryId) {
      return '';
    }
    return typeof list.categoryId === 'string'
      ? list.categoryId
      : list.categoryId._id;
  };

  const prepareCreatedList = (list, { categoryName } = {}) => {
    const categoryId = getListCategoryId(list);
    const matchedCategory = categories.find(category =>
      category._id === categoryId
      || category.name.toLowerCase() === (categoryName || '').toLowerCase()
    );
    const category = matchedCategory || {
      _id: categoryId,
      name: categoryName,
      subCategories: []
    };

    if (!matchedCategory && category._id && category.name) {
      setCategories(currentCategories => [...currentCategories, category]);
    }

    return {
      ...list,
      categoryId: category
    };
  };

  const handleNewListCreated = (list, metadata) => {
    setPendingNewList(prepareCreatedList(list, metadata));
    setShowNewList(false);
  };

  const finishNewListItems = () => {
    if (pendingNewList) {
      setLists(prev => [pendingNewList, ...prev]);
    }
    setPendingNewList(null);
  };

  const getOwnerUid = list => list.owner?.uid ?? list.ownerUid;
  const getCollaboratorUids = list => (list.collaborators || []).map(
    collaborator => collaborator.uid || collaborator
  );
  const isOwned = list => user?.uid === getOwnerUid(list);
  const isCollaborating = list => Boolean(
    user && getCollaboratorUids(list).includes(user.uid)
  );
  const isPinnedList = list => pinnedListIds.includes(list._id);
  const isLiked = list => list.currentUserReaction === 'like';
  const isHomeList = list => (
    isOwned(list) ||
    isCollaborating(list) ||
    isPinnedList(list) ||
    isLiked(list)
  );
  const isDiscoverList = list => (
    list.isPublic &&
    (!user || (
      !isOwned(list) &&
      !isCollaborating(list) &&
      !isPinnedList(list) &&
      !isLiked(list)
    ))
  );
  const visible = lists.filter(list =>
    viewMode === 'discover' ? isDiscoverList(list) : isHomeList(list)
  );
  const visibleCategories = [...categories].sort((left, right) =>
    compareStrings(left.name, right.name)
  );
  const pinnedSet = new Set(pinnedListIds);
  const filteredVisible = showPinnedOnly
    ? visible.filter(list => pinnedSet.has(list._id))
    : visible;
  const pinnedVisible = filteredVisible.filter(list => pinnedSet.has(list._id));
  const nonPinnedVisible = filteredVisible.filter(list => !pinnedSet.has(list._id));
  const orderedPinnedIds = pinnedListOrder
    .filter(listId => pinnedVisible.some(list => list._id === listId));
  const pinnedLists = [
    ...orderedPinnedIds
      .map(listId => pinnedVisible.find(list => list._id === listId))
      .filter(Boolean),
    ...pinnedVisible.filter(list => !orderedPinnedIds.includes(list._id))
  ];
  const personalLists = nonPinnedVisible.filter(list => {
    return isOwned(list) || isCollaborating(list) || isLiked(list);
  });
  const publicLists = nonPinnedVisible
    .filter(list => !personalLists.some(personalList => personalList._id === list._id))
    .sort((left, right) => {
      if ((right.rankingScore || 0) !== (left.rankingScore || 0)) {
        return (right.rankingScore || 0) - (left.rankingScore || 0);
      }
      if ((right.reactionScore || 0) !== (left.reactionScore || 0)) {
        return (right.reactionScore || 0) - (left.reactionScore || 0);
      }
      if ((right.likesCount || 0) !== (left.likesCount || 0)) {
        return (right.likesCount || 0) - (left.likesCount || 0);
      }
      return compareStrings(right.updatedAt || '', left.updatedAt || '');
    });
  const regularLists = [...personalLists, ...publicLists];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="chip mb-3">{viewMode === 'discover' ? 'Discover' : 'Workspace'}</div>
          <h1 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
            {viewMode === 'discover' ? 'Discover lists' : 'Your lists'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {viewMode === 'discover'
              ? user
                ? 'Browse public lists you have not pinned, liked, owned, or joined yet.'
                : 'Browse public lists from the ListIt community.'
              : 'Private, pinned, collaborative, owned, and liked lists collected in one place.'}
          </p>
        </div>

        <div className="control-bar flex flex-wrap items-center gap-3">
        {user && viewMode === 'home' && (
          <button
            onClick={() => setShowNewList(true)}
            className="primary-button"
          >
            + New List
          </button>
        )}

        {isAdmin && viewMode === 'home' && (
          <button
            onClick={() => setShowCatManager(v => !v)}
            className="secondary-button"
          >
            {showCatManager ? 'Hide Categories' : 'Manage Categories'}
          </button>
        )}

        {user && viewMode === 'home' && (
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showPinnedOnly}
              onChange={handleShowPinnedOnlyChange}
              className="h-4 w-4 rounded border-slate-300 text-slate-950"
            />
            Pinned Only
          </label>
        )}

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          Category
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="select-field"
          >
            <option value="">All</option>
            {visibleCategories.map(c => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        </div>
      </div>

      {isAdmin && showCatManager && (
        <CategoryManager
          categories={categories}
          setCategories={setCategories}
          user={user}
        />
      )}

      {pinnedLists.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase text-slate-500">
              Pinned Lists
            </h2>
            <div className="h-px flex-1 bg-slate-300/70" />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pinnedLists.map(list => (
              <ListDetail
                key={list._id}
                list={list}
                isPinned
                itemSortMode={itemSortMode}
                onDragEnd={() => setDraggedPinnedId(null)}
                onDragOver={event => event.preventDefault()}
                onDragStart={() => setDraggedPinnedId(list._id)}
                user={user}
                onDelete={handleDelete}
                onDrop={() => handlePinnedDrop(list._id)}
                onItemSortModeChange={handleItemSortModeChange}
                onListUpdate={(updatedList, options = {}) => {
                  setLists(prev => {
                    if (options.prepend) {
                      return [updatedList, ...prev];
                    }
                    return prev.map(existingList =>
                      existingList._id === updatedList._id
                        ? { ...existingList, ...updatedList }
                        : existingList
                    );
                  });
                }}
                onStartAddItem={handleStartAddItem}
                onTogglePin={() => handleTogglePin(list._id)}
              />
            ))}
          </div>
        </section>
      )}

      {pinnedLists.length > 0 && regularLists.length > 0 && (
        <div className="mb-8 h-px w-full bg-slate-300/70" />
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {regularLists.map(list => (
          <ListDetail
            key={list._id}
            list={list}
            isPinned={false}
            itemSortMode={itemSortMode}
            onDragEnd={() => setDraggedPinnedId(null)}
            onDragOver={() => {}}
            onDragStart={() => {}}
            user={user}
            onDelete={handleDelete}
            onDrop={() => {}}
            onItemSortModeChange={handleItemSortModeChange}
            onListUpdate={(updatedList, options = {}) => {
              setLists(prev => {
                if (options.prepend) {
                  return [updatedList, ...prev];
                }
                return prev.map(existingList =>
                  existingList._id === updatedList._id
                    ? { ...existingList, ...updatedList }
                    : existingList
                );
              });
            }}
            onStartAddItem={handleStartAddItem}
            onTogglePin={() => handleTogglePin(list._id)}
          />
        ))}
      </div>

      {pinnedLists.length === 0 && regularLists.length === 0 && (
        <div className="surface rounded-[28px] p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-950">
            {viewMode === 'discover' ? 'No new public lists right now' : 'No lists here yet'}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {viewMode === 'discover'
              ? user
                ? 'Public lists you pin, like, own, or collaborate on move out of Discover.'
                : 'Public lists will appear here as the community creates them.'
              : 'Create a list, accept an invite, pin a public list, or like one from Discover.'}
          </p>
        </div>
      )}

      {showNewList && (
        <NewListModal
          categories={visibleCategories}
          onCreated={handleNewListCreated}
          onClose={() => setShowNewList(false)}
        />
      )}

      {pendingNewList && (
        <NewListItemsModal
          list={pendingNewList}
          subCategories={pendingNewList.categoryId?.subCategories || []}
          onFinish={finishNewListItems}
        />
      )}
    </div>
  );
}
