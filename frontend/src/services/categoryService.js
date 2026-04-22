import api from '../api';

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
