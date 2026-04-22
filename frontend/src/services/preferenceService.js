import api from '../api';

export async function fetchPreferences() {
  const res = await api.get('/preferences');
  return res.data;
}

export async function updatePreferences(payload) {
  const res = await api.put('/preferences', payload);
  return res.data;
}
