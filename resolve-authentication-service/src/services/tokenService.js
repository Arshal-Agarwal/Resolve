const { randomUUID } = require('crypto');
const { SignJWT } = require('jose');
const config = require('../config');
const { getSigningKey } = require('../keys/keyManager');
const { getRedisClient } = require('../redis/client');
const redisKeys = require('../redis/keys');
const { getTokenSettings } = require('./tokenSettingsService');

/**
 * Issues a fresh access+refresh pair for an authenticated user.
 * Access token claim shape is frozen — Contract §3 — every other service's
 * authorization logic depends on this exact set of claims.
 *
 * TTL comes from tokenSettingsService, which checks for a per-org override
 * before falling back to the global default - Contract §10's PATCH
 * endpoint only has real effect if issuance actually reads this, rather
 * than always using the flat config value regardless of what's stored.
 */
async function issueTokenPair({ userId, organizationId, email }) {
  const privateKey = await getSigningKey();
  const { accessTokenTtlSeconds, refreshTokenTtlSeconds } = await getTokenSettings(organizationId);
  const tokenId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + accessTokenTtlSeconds;

  const accessToken = await new SignJWT({
    sub: userId,
    tenantId: organizationId,
    email,
    tokenId,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'RS256', kid: config.jwt.kid })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setIssuer(config.jwt.issuer)
    .sign(privateKey);

  const refreshTokenId = randomUUID();
  const issuedAt = new Date(now * 1000).toISOString();
  const expiresAt = new Date((now + refreshTokenTtlSeconds) * 1000).toISOString();

  const redis = getRedisClient();
  await redis.set(
    redisKeys.refreshSession(refreshTokenId),
    JSON.stringify({
      userId,
      organizationId,
      email,
      issuedAt,
      expiresAt,
      tokenFamilyId: refreshTokenId, // first token in its family; rotation preserves this
      status: 'ACTIVE',
      rotatedFrom: null,
    }),
    'EX',
    refreshTokenTtlSeconds,
  );

  // Schema §11 Option A: track this refresh token in the user's session
  // index so a future "invalidate everything for this user" (password
  // reset, admin-forced logout) can find and revoke every active session,
  // not just one this code path happens to already know about. The set's
  // own TTL is refreshed on every new token so it never outlives its
  // longest-lived member by much.
  await redis.sadd(redisKeys.userSessions(userId), refreshTokenId);
  await redis.expire(redisKeys.userSessions(userId), refreshTokenTtlSeconds);

  return {
    accessToken,
    refreshToken: refreshTokenId,
    tokenType: 'Bearer',
    expiresIn: accessTokenTtlSeconds,
  };
}

/**
 * Rotates a refresh token per Schema §5.1 invariants: the old token is
 * deleted (never reusable after rotation) and a new pair issued, carrying
 * the same tokenFamilyId forward. Returns null if the token is missing or
 * not ACTIVE (caller maps that to AUTH_INVALID_REFRESH_TOKEN). Redis's own
 * TTL already handles the "expired" case by evicting the key.
 */
async function rotateRefreshToken(refreshTokenId) {
  const redis = getRedisClient();
  // GETDEL is atomic: read-and-delete in one step. The previous GET-then-DEL
  // let two simultaneous requests carrying the SAME refresh token both read
  // it before either deleted it, so both succeeded - a double-spend that
  // defeats single-use rotation exactly when an attacker races the real user.
  const raw = await redis.getdel(redisKeys.refreshSession(refreshTokenId));
  if (!raw) return null;

  const session = JSON.parse(raw);
  if (session.status !== 'ACTIVE') return null;

  await redis.srem(redisKeys.userSessions(session.userId), refreshTokenId);

  return issueTokenPair({
    userId: session.userId,
    organizationId: session.organizationId,
    email: session.email,
  });
}

/**
 * Revokes an access token (logout) — Schema §5.2. TTL is set to the
 * token's remaining life; there's no reason to remember a revocation past
 * the point the JWT itself would have expired anyway.
 */
async function revokeAccessToken(tokenId, expUnixSeconds) {
  const remaining = Math.max(expUnixSeconds - Math.floor(Date.now() / 1000), 1);
  await getRedisClient().set(redisKeys.revokedAccessToken(tokenId), '1', 'EX', remaining);
}

/**
 * @param {string} refreshTokenId
 * @param {string} [userId] - when provided (logout passes the caller's own id
 *   from their verified access token), the token is only deleted if it
 *   actually belongs to that user. Without this check any authenticated user
 *   could revoke any other user's refresh session just by submitting its id.
 *   Returns true if a session was deleted.
 */
async function deleteRefreshToken(refreshTokenId, userId) {
  const redis = getRedisClient();
  const key = redisKeys.refreshSession(refreshTokenId);

  if (userId) {
    const raw = await redis.get(key);
    if (!raw) return false;
    if (JSON.parse(raw).userId !== userId) return false;
    await redis.del(key);
    await redis.srem(redisKeys.userSessions(userId), refreshTokenId);
    return true;
  }

  return (await redis.del(key)) > 0;
}

async function isAccessTokenRevoked(tokenId) {
  const value = await getRedisClient().get(redisKeys.revokedAccessToken(tokenId));
  return value !== null;
}

/**
 * Schema §11/§12: "Password reset succeeds → Invalidate existing sessions."
 * Previously missing entirely — a reset updated the password but left every
 * other active refresh session valid. Deletes every refresh token this user
 * currently has active, then clears the index itself. Does NOT revoke
 * already-issued access tokens individually (those aren't indexed per-user,
 * only per-tokenId) — they remain valid until their own natural expiry
 * (at most `ACCESS_TOKEN_TTL_SECONDS`), which is a known, bounded exposure
 * window worth being aware of, not a silent gap.
 */
async function invalidateAllUserSessions(userId) {
  const redis = getRedisClient();
  const sessionSetKey = redisKeys.userSessions(userId);
  const refreshTokenIds = await redis.smembers(sessionSetKey);

  if (refreshTokenIds.length > 0) {
    await redis.del(...refreshTokenIds.map((id) => redisKeys.refreshSession(id)));
  }
  await redis.del(sessionSetKey);
}

module.exports = {
  issueTokenPair,
  rotateRefreshToken,
  revokeAccessToken,
  deleteRefreshToken,
  isAccessTokenRevoked,
  invalidateAllUserSessions,
};
