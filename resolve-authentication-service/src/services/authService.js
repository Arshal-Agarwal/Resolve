const { fromCode } = require('../errors/AppError');
const organizationClient = require('../clients/organizationClient');
const userTeamClient = require('../clients/userTeamClient');
const tokenService = require('./tokenService');
const { checkLoginRateLimit } = require('./rateLimitService');
const mfaService = require('./mfaService');

/**
 * Password authentication followed by optional TOTP MFA.
 * MFA-enrolled users receive a short-lived challenge instead of JWTs.
 * The access-token contract remains unchanged.
 */
async function login({ email, password, organizationSlug }, requestIp) {
  const rateLimit = await checkLoginRateLimit(email, requestIp);
  if (rateLimit.limited) {
    throw fromCode('AUTH_RATE_LIMITED', 'Too many login attempts. Try again later.', {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  // Step 1 — resolve tenant (Contract §5 Step 1 / §14.0)
  const org = await organizationClient.findOrganizationBySlug(organizationSlug);
  if (!org || org.status === 'SUSPENDED') {
    throw fromCode('AUTH_INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  // Step 2 — resolve user within that tenant (§14.1). Lookup existing at
  // all is what gates whether we proceed; its `status` is not used as the
  // disabled/active signal (see note below on why).
  const userLookup = await userTeamClient.lookupUser(org.id, email);
  if (!userLookup) {
    throw fromCode('AUTH_INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  // Step 3 — verify credentials (§14.2).
  //
  // Ambiguity resolution (flagging rather than silently picking): §5's
  // Implementation Notes say "if found and status = ACTIVE, call
  // verify-credentials," which read literally would skip credential
  // checking entirely for a disabled account. But §5's 403 response
  // description explicitly says AUTH_ACCOUNT_DISABLED only applies when
  // "the credentials *were* correct" — which requires actually checking
  // them. verify-credentials' own response includes a `status` field for
  // exactly this reason. So: always call verify-credentials once a user is
  // found, and use *its* status (not the lookup's) as the ACTIVE/disabled
  // signal. This is the only reading that makes both sentences true at once.
  const verification = await userTeamClient.verifyCredentials(userLookup.userId, password);
  if (!verification.valid) {
    throw fromCode('AUTH_INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  if (verification.status !== 'ACTIVE') {
    throw fromCode(
      'AUTH_ACCOUNT_DISABLED',
      'This account has been disabled. Contact your organization administrator.',
    );
  }

  // MFA is optional. Enrolled accounts receive a short-lived challenge and
  // no JWTs until the second factor is verified.
  if (await mfaService.isEnabled(userLookup.userId, org.id)) {
    return mfaService.createChallenge({ userId: userLookup.userId, tenantId: org.id, email });
  }

  return tokenService.issueTokenPair({ userId: userLookup.userId, organizationId: org.id, email });
}

/**
 * POST /api/v1/auth/refresh — Contract §6. Rotation: old token invalidated,
 * new pair issued on every use.
 */
async function verifyMfa({ mfaChallengeToken, code }) {
  const identity = await mfaService.verifyChallenge({ token: mfaChallengeToken, code });
  return tokenService.issueTokenPair({
    userId: identity.userId,
    organizationId: identity.tenantId,
    email: identity.email,
  });
}

async function refresh({ refreshToken }) {
  const pair = await tokenService.rotateRefreshToken(refreshToken);
  if (!pair) {
    throw fromCode('AUTH_INVALID_REFRESH_TOKEN', 'Refresh token is invalid, expired, or already used.');
  }
  return pair;
}

/**
 * POST /api/v1/auth/logout — Contract §7. `tokenClaims` comes from the
 * authenticate middleware (already signature/exp/revocation-verified).
 */
async function logout(tokenClaims, refreshToken) {
  await tokenService.revokeAccessToken(tokenClaims.tokenId, tokenClaims.exp);
  if (refreshToken) {
    await tokenService.deleteRefreshToken(refreshToken, tokenClaims.sub);
  }
}

module.exports = { login, verifyMfa, refresh, logout };
