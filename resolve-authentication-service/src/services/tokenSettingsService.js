const config = require('../config');
const { getRedisClient } = require('../redis/client');
const redisKeys = require('../redis/keys');

/**
 * Contract §10 / RBAC Contract §9's AUTH_SETTINGS_MANAGE note describe the
 * request/response shape but never say WHERE per-tenant overrides are
 * stored. Resolved here: Redis, no TTL (persists until explicitly changed),
 * since Authentication Service owns no Postgres table at all (Contract
 * §1's ownership recap) - Redis is the only storage this service already
 * has without introducing a new cross-service dependency just for one
 * small settings object. Flagging this as a real decision, not an
 * obviously-correct default.
 */
async function getTokenSettings(organizationId) {
  const raw = await getRedisClient().get(redisKeys.tokenSettings(organizationId));
  if (raw) {
    const override = JSON.parse(raw);
    return {
      organizationId,
      accessTokenTtlSeconds: override.accessTokenTtlSeconds,
      refreshTokenTtlSeconds: config.jwt.refreshTokenTtlSeconds,
    };
  }
  return {
    organizationId,
    accessTokenTtlSeconds: config.jwt.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: config.jwt.refreshTokenTtlSeconds,
  };
}

/**
 * PATCH only ever accepts accessTokenTtlSeconds per the contract's request
 * shape - refreshTokenTtlSeconds is not settable per-tenant today.
 */
async function updateAccessTokenTtl(organizationId, accessTokenTtlSeconds) {
  await getRedisClient().set(
    redisKeys.tokenSettings(organizationId),
    JSON.stringify({ accessTokenTtlSeconds }),
  );
  return getTokenSettings(organizationId);
}

module.exports = { getTokenSettings, updateAccessTokenTtl };
