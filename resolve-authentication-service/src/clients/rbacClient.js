const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { fromCode } = require('../errors/AppError');

const http = axios.create({
  baseURL: config.dependencies.rbacServiceUrl,
  timeout: 3000,
  headers: { 'X-Internal-Service-Token': config.dependencies.internalServiceToken },
});

/**
 * POST /internal/v1/authz/check on RBAC Service (Contracts/RBAC_Service.md §7.1).
 * Throws DEPENDENCY_UNAVAILABLE (503) on a real outage - same principle as
 * organizationClient/userTeamClient: a dependency being down must never be
 * silently treated as "permission denied."
 */
async function checkPermission({ userId, organizationId, permission }) {
  try {
    const res = await http.post('/internal/v1/authz/check', { userId, organizationId, permission });
    return res.data.allowed;
  } catch (err) {
    logger.error({ err: err.message, userId, organizationId, permission }, 'RBAC Service call failed');
    throw fromCode('DEPENDENCY_UNAVAILABLE', 'RBAC Service is temporarily unavailable.');
  }
}

module.exports = { checkPermission };
