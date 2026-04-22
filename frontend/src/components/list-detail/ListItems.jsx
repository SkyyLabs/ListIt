import React from 'react';

export default function ListItems({
  availableSubCategories,
  canEditItemMetadata,
  canRemoveItems,
  canToggleItems,
  displayItems,
  draftItems,
  editMode,
  itemsToRemove,
  onDraftItemChange,
  onRemoveItem,
  onToggleDone,
  onUndoRemove,
  _user
}) {
  return (
    <ul className="soft-scrollbar mb-4 max-h-32 space-y-1 overflow-auto sm:max-h-40 sm:space-y-2 md:max-h-48">
      {displayItems.map(item => {
        const canRemoveItem = canRemoveItems;
        const isRemoved = itemsToRemove.has(item._id);
        const draftItem = draftItems[item._id] || item;

        return (
          <li key={item._id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={item.done}
              disabled={editMode || !canToggleItems}
              onChange={() => onToggleDone(item)}
              className="mt-1 h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5"
            />
            <div className="min-w-0 flex-1">
              {editMode && canEditItemMetadata ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={draftItem.text}
                    onChange={event =>
                      onDraftItemChange(item._id, 'text', event.target.value)
                    }
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    list={`subcategories-${item._id}`}
                    value={draftItem.subCategory}
                    onChange={event =>
                      onDraftItemChange(item._id, 'subCategory', event.target.value)
                    }
                    className="w-full rounded border px-2 py-1 text-xs sm:text-sm"
                  />
                  <datalist id={`subcategories-${item._id}`}>
                    {availableSubCategories.map(subCategory => (
                      <option key={subCategory} value={subCategory} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <span className={item.done ? 'line-through text-gray-500' : ''}>
                  {draftItem.text}
                </span>
              )}
            </div>
            {draftItem.subCategory && (
              <span className="flex-shrink-0 text-xs sm:text-sm italic text-gray-700">
                {draftItem.subCategory}
              </span>
            )}
            {editMode && canRemoveItem && (
              isRemoved ? (
                <button
                  onClick={() => onUndoRemove(item._id)}
                  className="flex-shrink-0 text-yellow-600 text-xs sm:text-sm"
                >
                  Undo
                </button>
              ) : (
                <button
                  onClick={() => onRemoveItem(item._id)}
                  className="flex-shrink-0 text-red-600 text-xs sm:text-sm"
                >
                  −
                </button>
              )
            )}
          </li>
        );
      })}
    </ul>
  );
}
