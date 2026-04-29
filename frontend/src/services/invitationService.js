import api from '../api';

export async function fetchInvitation(token) {
  const res = await api.get(`/invitations/${token}`);
  return res.data;
}

export async function acceptInvitation(token) {
  const res = await api.post(`/invitations/${token}/accept`);
  return res.data;
}
