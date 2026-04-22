function hasAdminRole(user) {
  return Boolean(
    user?.admin === true ||
    (Array.isArray(user?.roles) && user.roles.includes('admin'))
  );
}

module.exports = { hasAdminRole };
