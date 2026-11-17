const config = require('../config');

/**
 * Key naming decision (this ambiguity has since been resolved in the docs
 * themselves too — Schemas/01_Authentication_Service_Schema.md §4 and
 * Contracts/Authentication_Service.md §15 now both specify this exact
 * hierarchical form): `resolve:auth:mfa:challenge:{token}`,
 * `resolve:auth:password-reset:{token}`, split email/ip rate-limit keys,
 * rather than the contract's original shorter names. Reasoning:
 * colon-delimited hierarchy is more debuggable in `redis-cli SCAN`, and
 * splitting the rate limit by identity (email) vs source (ip) matches §2's
 * explicit requirement to check both independently.
 */
const PREFIX = config.redis.keyPrefix; // 'resolve:auth:'

const keys = {
  refreshSession: (refreshTokenId) => `${PREFIX}refresh:${refreshTokenId}`,
  revokedAccessToken: (tokenId) => `${PREFIX}session:revoked:${tokenId}`,
  mfaOtp: (userId) => `${PREFIX}mfa:otp:${userId}`,
  mfaAccount: (userTenantId) => `${PREFIX}mfa:account:${userTenantId}`,
  mfaEnrollment: (userTenantId) => `${PREFIX}mfa:enrollment:${userTenantId}`,
  mfaAttempts: (challengeToken) => `${PREFIX}mfa:attempts:${challengeToken}`,
  mfaEnrollmentAttempts: (userTenantId) => `${PREFIX}mfa:enrollment-attempts:${userTenantId}`,
  mfaReplay: (tenantId, userId, counter) => `${PREFIX}mfa:replay:${tenantId}:${userId}:${counter}`,
  mfaChallenge: (challengeToken) => `${PREFIX}mfa:challenge:${challengeToken}`,
  passwordResetToken: (resetToken) => `${PREFIX}password-reset:${resetToken}`,
  loginRateLimitByEmail: (normalizedEmail, window) =>
    `${PREFIX}ratelimit:login:email:${normalizedEmail}:${window}`,
  loginRateLimitByIp: (ip, window) => `${PREFIX}ratelimit:login:ip:${ip}:${window}`,
  // Added per Schema §13 item 7 ("rate limiting is mandatory for login AND
  // reset endpoints") - previously only login had a key pattern defined.
  passwordResetRateLimitByEmail: (normalizedEmail, window) =>
    `${PREFIX}ratelimit:passwordreset:email:${normalizedEmail}:${window}`,
  passwordResetRateLimitByIp: (ip, window) => `${PREFIX}ratelimit:passwordreset:ip:${ip}:${window}`,
  // Schema §11 Option A - per-user index of active refresh-token IDs, so a
  // password reset (or any future "log out everywhere") can invalidate every
  // active session for a user, not just the one refresh token it happens to
  // know about at the time.
  userSessions: (userId) => `${PREFIX}user-sessions:${userId}`,
  // Per-tenant token TTL override (Contract §10). Not specified anywhere in
  // the contract WHERE this should be stored - Auth Service owns no
  // Postgres table (§1's ownership recap), so Redis is the only option
  // that doesn't require a new cross-service storage decision. No TTL on
  // this key: an org's setting should persist indefinitely until changed,
  // not silently reset to the global default after some expiry.
  tokenSettings: (organizationId) => `${PREFIX}token-settings:${organizationId}`,
};

module.exports = keys;
