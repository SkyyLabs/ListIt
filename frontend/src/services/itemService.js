import api from '../api';

export async function fetchItems(listId) {
  const res = await api.get(`/items/${listId}`);
  return res.data;
}

export async function createItem(listId, payload) {
  const res = await api.post('/items', { listId, ...payload });
  return res.data;
}

export async function updateItemDone(itemId, done) {
  const res = await api.put(`/items/${itemId}`, { done });
  return res.data;
}

export async function removeItem(itemId) {
  await api.delete(`/items/${itemId}`);
}
