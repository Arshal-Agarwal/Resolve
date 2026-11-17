const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { fromCode } = require('../errors/AppError');

const http = axios.create({
  baseURL: config.dependencies.organizationServiceUrl,
  timeout: 3000,
  headers: { 'X-Internal-Service-Token': config.dependencies.internalServiceToken },
});

/**
 * GET /internal/v1/organizations/by-slug/{slug} — Contract §14.0
 * Returns the org object on success, or null on 404 (unknown slug).
 *
 * Any other failure (network, 5xx, timeout) throws DEPENDENCY_UNAVAILABLE
 * (503) — Schema §12's edge-case table requires "Organization Service
 * unavailable → Return controlled 503" specifically so an outage is never
 * conflated with invalid credentials. This used to just rethrow the raw
 * axios error, which fell through to the generic error handler as a plain
 * 500 — same underlying cause, wrong signal to whoever's monitoring this.
 */
async function findOrganizationBySlug(slug) {
  try {
    const res = await http.get(`/internal/v1/organizations/by-slug/${encodeURIComponent(slug)}`);
    return res.data; // { id, name, slug, status }
  } catch (err) {
    if (err.response?.status === 404) return null;
    logger.error({ err: err.message, slug }, 'Organization Service call failed');
    throw fromCode('DEPENDENCY_UNAVAILABLE', 'Organization Service is temporarily unavailable.');
  }
}

module.exports = { findOrganizationBySlug };
