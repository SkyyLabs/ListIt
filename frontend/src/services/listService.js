import api from '../api';

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

export async function addCollaborator(listId, payload) {
  const res = await api.post(`/lists/${listId}/collaborators`, payload);
  return res.data;
}

export async function createCollaboratorInvitation(listId, payload) {
  const res = await api.post(`/lists/${listId}/invitations`, payload);
  return res.data;
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
