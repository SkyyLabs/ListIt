const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildVisibleListFilter
} = require('./listService');

test('buildVisibleListFilter includes public, owner, and collaborator access', () => {
  assert.deepEqual(buildVisibleListFilter('user-1'), {
    $or: [
      { isPublic: true },
      { ownerUid: 'user-1' },
      { 'collaborators.uid': 'user-1' }
    ]
  });
});

test('buildVisibleListFilter carries an optional category filter', () => {
  assert.deepEqual(buildVisibleListFilter('user-1', 'cat-1'), {
    $or: [
      { isPublic: true },
      { ownerUid: 'user-1' },
      { 'collaborators.uid': 'user-1' }
    ],
    categoryId: 'cat-1'
  });
});
