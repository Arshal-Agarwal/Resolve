const { randomUUID } = require('crypto');
const { fromCode } = require('../errors/AppError');
const organizationClient = require('../clients/organizationClient');
const userTeamClient = require('../clients/userTeamClient');
const config = require('../config');
const logger = require('../utils/logger');
const { getRedisClient } = require('../redis/client');
const redisKeys = require('../redis/keys');
const { checkPasswordResetRateLimit } = require('./rateLimitService');
const { invalidateAllUserSessions } = require('./tokenService');

/**
 * ⚠️ KNOWN GAP, called out explicitly in Contract §8 itself: this service
 * has no email-sending capability and no Kafka producer (per kafka.md §32,
 * Auth has zero Kafka involvement). The contract says delivery "must happen
 * via a direct synchronous call to a notification/email capability" and
 * flags that as something to resolve with Notification Service's team,
 * since Notification Service's documented design is consumer-only (it
 * reacts to Kafka events, it doesn't expose a synchronous send-email
 * endpoint anywhere in this doc set).
 *
 * Rather than invent a fake HTTP contract for a service I have no frozen
 * spec for, this function is a deliberately inert stub: it logs the event
 * (useful for local dev/QA to find the token without email) and does
 * nothing else. Swap this for a real call once Notification Service (or
 * whatever ends up handling this) publishes a synchronous contract.
 */
function deliverResetTokenStub(email, resetToken) {
  logger.warn(
    { email, resetToken },
    'Password reset token generated but NOT delivered — no synchronous email/notification ' +
      'capability exists yet (see Contract §8 and src/services/passwordResetService.js). ' +
      'This is a cross-team gap, not a bug in this service.',
  );
}

/**
 * POST /api/v1/auth/password-reset/request — Contract §8.
 * Always resolves successfully (202-equivalent) regardless of whether the
 * org/email combo exists — same anti-enumeration principle as login. The
 * caller controller always returns 202; this function just decides whether
 * there's anything to actually do underneath that response.
 *
 * Rate limiting added per Schema §13 item 7 ("mandatory for login AND
 * reset endpoints") — this previously had no limit at all, which is a
 * real gap the schema doc's own security requirements flag directly.
 */
async function requestPasswordReset({ email, organizationSlug }, requestIp) {
  const rateLimit = await checkPasswordResetRateLimit(email, requestIp);
  if (rateLimit.limited) {
    throw fromCode('AUTH_RATE_LIMITED', 'Too many password reset attempts. Try again later.', {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  const org = await organizationClient.findOrganizationBySlug(organizationSlug);
  if (!org || org.status === 'SUSPENDED') return;

  const userLookup = await userTeamClient.lookupUser(org.id, email);
  if (!userLookup) return;

  const resetToken = randomUUID();
  const expiresAt = new Date(Date.now() + config.passwordReset.tokenTtlSeconds * 1000).toISOString();

  await getRedisClient().set(
    redisKeys.passwordResetToken(resetToken),
    JSON.stringify({ userId: userLookup.userId, organizationId: org.id, expiresAt }),
    'EX',
    config.passwordReset.tokenTtlSeconds,
  );

  deliverResetTokenStub(email, resetToken);
}

/**
 * POST /api/v1/auth/password-reset/confirm — Contract §8.
 * Token is deleted only after the downstream password-hash update
 * succeeds — if User & Team Service is briefly unavailable, the token
 * stays valid for a retry rather than being burned on a failed attempt.
 *
 * Session invalidation added per Schema §11/§12 ("Password reset succeeds
 * → Invalidate existing sessions") — this was previously missing entirely;
 * a reset updated the password but left every other active session alone.
 */
async function confirmPasswordReset({ resetToken, newPassword }) {
  const redis = getRedisClient();
  const key = redisKeys.passwordResetToken(resetToken);
  const raw = await redis.get(key);
  if (!raw) {
    throw fromCode('AUTH_RESET_TOKEN_INVALID', 'Reset token is invalid or has expired.');
  }

  const { userId } = JSON.parse(raw);
  await userTeamClient.updatePasswordHash(userId, newPassword);
  await redis.del(key);
  await invalidateAllUserSessions(userId);
}

module.exports = { requestPasswordReset, confirmPasswordReset };
