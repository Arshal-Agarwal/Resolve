const { jwtVerify } = require('jose');
const config = require('../config');
const { loadOrGenerateKeys } = require('../keys/keyManager');
const { isAccessTokenRevoked } = require('../services/tokenService');
const { fromCode } = require('../errors/AppError');

/**
 * Implements Contract §3's verification algorithm, steps 1-6 (steps 12-13,
 * putting the context into the request and continuing to RBAC, are this
 * middleware's job vs. RBAC Service's respectively — RBAC itself is a
 * separate service, not called here).
 *
 * This service verifies against its OWN key directly (it's the issuer) —
 * it doesn't loop back through its own /.well-known/jwks.json over HTTP.
 * Every OTHER service does fetch+cache that endpoint; this one already has
 * the key in memory.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(fromCode('AUTH_INVALID_TOKEN', 'Missing or malformed Authorization header.'));
  }
  const token = header.slice('Bearer '.length);

  try {
    const { publicKey } = await loadOrGenerateKeys();
    const { payload } = await jwtVerify(token, publicKey, { issuer: config.jwt.issuer });

    if (payload.type !== 'access') {
      return next(fromCode('AUTH_INVALID_TOKEN', 'Token is not an access token.'));
    }

    const revoked = await isAccessTokenRevoked(payload.tokenId);
    if (revoked) {
      return next(fromCode('AUTH_INVALID_TOKEN', 'Token has been revoked.'));
    }

    req.auth = payload; // { sub, tenantId, email, tokenId, type, iat, exp, iss, kid }
    return next();
  } catch (err) {
    return next(
      fromCode('AUTH_INVALID_TOKEN', 'Access token is missing, malformed, expired, or invalid.', {
        cause: err.message,
      }),
    );
  }
}

module.exports = authenticate;
