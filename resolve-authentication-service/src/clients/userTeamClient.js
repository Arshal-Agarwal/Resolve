const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const http = axios.create({
  baseURL: config.dependencies.userTeamServiceUrl,
  timeout: 3000,
  headers: { 'X-Internal-Service-Token': config.dependencies.internalServiceToken },
});

/**
 * GET /internal/v1/users/lookup?organizationId=&email= — Contract §14.1
 * Returns { userId, status } on success, or null on 404 (no such user).
 */
async function lookupUser(organizationId, email) {
  try {
    const res = await http.get('/internal/v1/users/lookup', { params: { organizationId, email } });
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    logger.error({ err: err.message, organizationId }, 'User & Team Service lookup failed');
    throw err;
  }
}

/**
 * POST /internal/v1/users/{id}/verify-credentials — Contract §14.2
 * `valid: false` is a normal response, not an error — Authentication decides
 * the client-facing shape. The password hash is never returned to us.
 */
async function verifyCredentials(userId, plaintextPassword) {
  const res = await http.post(`/internal/v1/users/${encodeURIComponent(userId)}/verify-credentials`, {
    plaintextPassword,
  });
  return res.data; // { valid, status, organizationId }
}

/**
 * PATCH /internal/v1/users/{id}/password-hash — Contract §14.3
 * Not used until Phase 3 (password reset) — included now so the client
 * module is complete and doesn't need revisiting per-endpoint later.
 */
async function updatePasswordHash(userId, newPlaintextPassword) {
  await http.patch(`/internal/v1/users/${encodeURIComponent(userId)}/password-hash`, {
    newPlaintextPassword,
  });
}

module.exports = { lookupUser, verifyCredentials, updatePasswordHash };
