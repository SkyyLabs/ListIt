export function isAdminFromClaims(claims = {}) {
  return claims.admin === true
    || (Array.isArray(claims.roles) && claims.roles.includes('admin'));
}
