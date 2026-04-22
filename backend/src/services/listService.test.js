const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertListOwner,
  buildVisibleListFilter
} = require('./listService');

test('buildVisibleListFilter includes public, owner, and collaborator access', () => {
  assert.deepEqual(buildVisibleListFilter('user-1'), {
    $or: [
      { isPublic: true },
      { ownerUid: 'user-1' },
      { collaborators: 'user-1' },
      { 'collaborators.uid': 'user-1' }
    ]
  });
});

test('buildVisibleListFilter carries an optional category filter', () => {
  assert.deepEqual(buildVisibleListFilter('user-1', 'cat-1'), {
    $or: [
      { isPublic: true },
      { ownerUid: 'user-1' },
      { collaborators: 'user-1' },
      { 'collaborators.uid': 'user-1' }
    ],
    categoryId: 'cat-1'
  });
});

test('assertListOwner throws when a non-owner attempts an owner-only action', () => {
  assert.throws(
    () => assertListOwner({ ownerUid: 'owner-1' }, 'user-2'),
    error => error.status === 403 && error.message === 'Forbidden'
  );
});
