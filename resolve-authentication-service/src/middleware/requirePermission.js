const rbacClient = require('../clients/rbacClient');
const { fromCode } = require('../errors/AppError');

/**
 * Unlike RBAC Service's own requirePermission (which checks its own DB
 * directly, no network call), Authentication Service is a genuinely
 * different service from RBAC - this has to be a real HTTP call.
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const allowed = await rbacClient.checkPermission({
        userId: req.auth.sub,
        organizationId: req.auth.tenantId,
        permission,
      });
      if (!allowed) {
        return next(fromCode('AUTH_FORBIDDEN', `Missing required permission: ${permission}`));
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = requirePermission;
