import React from 'react';

export default function ListItems({
  canToggleItems,
  displayItems,
  editMode,
  isOwner,
  itemsToRemove,
  onRemoveItem,
  onToggleDone,
  onUndoRemove,
  user
}) {
  return (
    <ul className="space-y-1 sm:space-y-2 overflow-auto mb-4 max-h-32 sm:max-h-40 md:max-h-48">
      {displayItems.map(item => {
        const canRemoveItem = isOwner || item.addedBy === user?.uid;
        const isRemoved = itemsToRemove.has(item._id);

        return (
          <li key={item._id} className="flex items-center">
            <input
              type="checkbox"
              checked={item.done}
              disabled={editMode || !canToggleItems}
              onChange={() => onToggleDone(item)}
              className="mr-2 h-4 w-4 sm:h-5 sm:w-5"
            />
            <span className={item.done ? 'line-through text-gray-500' : ''}>
              {item.text}
            </span>
            {item.subCategory && (
              <span className="ml-auto text-xs sm:text-sm italic text-gray-700">
                {item.subCategory}
              </span>
            )}
            {editMode &&
              canRemoveItem &&
              (isRemoved ? (
                <button
                  onClick={() => onUndoRemove(item._id)}
                  className="ml-2 text-yellow-600 text-xs sm:text-sm"
                >
                  Undo
                </button>
              ) : (
                <button
                  onClick={() => onRemoveItem(item._id)}
                  className="ml-2 text-red-600 text-xs sm:text-sm"
                >
                  −
                </button>
              ))}
          </li>
        );
      })}
    </ul>
  );
}
