import { isAdminFromClaims } from './authClaims';

describe('isAdminFromClaims', () => {
  test('returns true when the admin claim is explicitly set', () => {
    expect(isAdminFromClaims({ admin: true })).toBe(true);
  });

  test('returns true when roles contains admin', () => {
    expect(isAdminFromClaims({ roles: ['editor', 'admin'] })).toBe(true);
  });

  test('returns false for non-admin claims', () => {
    expect(isAdminFromClaims({ roles: ['editor'] })).toBe(false);
    expect(isAdminFromClaims({})).toBe(false);
  });
});
