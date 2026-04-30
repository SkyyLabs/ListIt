// frontend/src/api.js
import axios from 'axios';
import { auth } from './firebase';

const apiBaseUrl = import.meta.env.REACT_APP_API_BASE_URL
  || (import.meta.env.DEV ? 'http://localhost:4000' : undefined);

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true
});

// Before every request, grab the current Firebase user token and set it
api.interceptors.request.use(
  async config => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

export default api;

export async function fetchCategories() {
  const res = await api.get('/categories');
  return res.data;
}

export async function createCategory(name) {
  const res = await api.post('/categories', { name });
  return res.data;
}

export async function renameCategory(categoryId, name) {
  const res = await api.put(`/categories/${categoryId}`, { name });
  return res.data;
}

export async function removeCategory(categoryId) {
  await api.delete(`/categories/${categoryId}`);
}

export async function fetchInvitation(token) {
  const res = await api.get(`/invitations/${token}`);
  return res.data;
}

export async function acceptInvitation(token) {
  const res = await api.post(`/invitations/${token}/accept`);
  return res.data;
}

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

export async function updateItem(itemId, payload) {
  const res = await api.patch(`/items/${itemId}`, payload);
  return res.data;
}

export async function removeItem(itemId) {
  await api.delete(`/items/${itemId}`);
}

export async function fetchLists(params = {}) {
  const res = await api.get('/lists', { params });
  return res.data;
}

export async function createList(payload) {
  const res = await api.post('/lists', payload);
  return res.data;
}

export async function updateList(listId, payload) {
  const res = await api.put(`/lists/${listId}`, payload);
  return res.data;
}

export async function removeList(listId) {
  await api.delete(`/lists/${listId}`);
}

export async function createCollaboratorInvitation(listId, payload) {
  const res = await api.post(`/lists/${listId}/invitations`, payload);
  return res.data;
}

export async function cancelCollaboratorInvitation(listId, invitationId) {
  await api.delete(`/lists/${listId}/invitations/${invitationId}`);
}

export async function updateCollaboratorPermissions(listId, uid, permissions) {
  const res = await api.put(`/lists/${listId}/collaborators/${uid}`, {
    permissions
  });
  return res.data;
}

export async function removeCollaborator(listId, uid) {
  const res = await api.delete(`/lists/${listId}/collaborators/${uid}`);
  return res.data;
}

export async function updateListReaction(listId, reaction) {
  const res = await api.put(`/lists/${listId}/reaction`, { reaction });
  return res.data;
}

export async function duplicateList(listId) {
  const res = await api.post(`/lists/${listId}/duplicate`);
  return res.data;
}

export async function fetchPreferences() {
  const res = await api.get('/preferences');
  return res.data;
}

export async function updatePreferences(payload) {
  const res = await api.put('/preferences', payload);
  return res.data;
}
