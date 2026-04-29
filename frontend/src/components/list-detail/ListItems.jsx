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
    <ul className="soft-scrollbar mb-4 max-h-52 space-y-2 overflow-auto pr-1">
      {displayItems.map(item => {
        const canRemoveItem = canRemoveItems;
        const isRemoved = itemsToRemove.has(item._id);
        const draftItem = draftItems[item._id] || item;

        return (
          <li
            key={item._id}
            className={`flex items-start gap-3 rounded-2xl bg-white/48 p-3 shadow-sm transition ${isRemoved ? 'opacity-60' : ''}`}
          >
            <input
              type="checkbox"
              checked={item.done}
              disabled={editMode || !canToggleItems}
              onChange={() => onToggleDone(item)}
              className="mt-1 h-5 w-5 flex-shrink-0 rounded-md border-slate-300 text-slate-950"
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
                    className="field py-1.5"
                  />
                  <input
                    type="text"
                    list={`subcategories-${item._id}`}
                    value={draftItem.subCategory}
                    onChange={event =>
                      onDraftItemChange(item._id, 'subCategory', event.target.value)
                    }
                    className="field py-1.5 text-xs"
                  />
                  <datalist id={`subcategories-${item._id}`}>
                    {availableSubCategories.map(subCategory => (
                      <option key={subCategory} value={subCategory} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <span className={`text-sm font-semibold leading-6 ${item.done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                  {draftItem.text}
                </span>
              )}
            </div>
            {draftItem.subCategory && (
              <span className="max-w-[34%] flex-shrink-0 truncate rounded-full bg-white/60 px-2 py-1 text-xs font-semibold text-slate-600">
                {draftItem.subCategory}
              </span>
            )}
            {editMode && canRemoveItem && (
              isRemoved ? (
                <button
                  onClick={() => onUndoRemove(item._id)}
                  className="flex-shrink-0 text-xs font-semibold text-amber-700"
                >
                  Undo
                </button>
              ) : (
                <button
                  onClick={() => onRemoveItem(item._id)}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/65 text-sm font-semibold text-rose-600"
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
