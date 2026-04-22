const test = require('node:test');
const assert = require('node:assert/strict');
const { hasAdminRole } = require('./roles');

test('hasAdminRole accepts the explicit admin boolean claim', () => {
  assert.equal(hasAdminRole({ admin: true }), true);
});

test('hasAdminRole accepts admin in the roles array', () => {
  assert.equal(hasAdminRole({ roles: ['editor', 'admin'] }), true);
});

test('hasAdminRole rejects users without admin claims', () => {
  assert.equal(hasAdminRole({ roles: ['editor'] }), false);
  assert.equal(hasAdminRole({}), false);
});
