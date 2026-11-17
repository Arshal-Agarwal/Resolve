require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toBool(value) {
  return String(value).toLowerCase() === 'true';
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4001),
  logLevel: process.env.LOG_LEVEL || 'info',

  redis: {
    url: required('REDIS_URL', 'redis://localhost:6379'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'resolve:auth:',
  },

  dependencies: {
    useMocks: toBool(process.env.USE_MOCKS ?? 'true'),
    userTeamServiceUrl: required('USER_TEAM_SERVICE_URL', 'http://localhost:4100'),
    organizationServiceUrl: required('ORGANIZATION_SERVICE_URL', 'http://localhost:4200'),
    rbacServiceUrl: required('RBAC_SERVICE_URL', 'http://localhost:4300'),
    internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || 'dev-internal-service-token',
  },

  jwt: {
    kid: process.env.JWT_KID || '2026-09-key-1',
    issuer: process.env.JWT_ISSUER || 'resolve-authentication-service',
    privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || 'src/keys/private.pem',
    publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || 'src/keys/public.pem',
    accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 3600),
    refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 2592000),
  },

  rateLimit: {
    loginMaxAttempts: Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 10),
    loginWindowSeconds: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS || 900),
    // Added per Schema §13 item 7 ("rate limiting is mandatory for login AND
    // reset endpoints") - password-reset/request previously had no limit at all.
    passwordResetMaxAttempts: Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS || 5),
    passwordResetWindowSeconds: Number(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS || 900),
  },

  mfa: {
    // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    encryptionKey: process.env.MFA_ENCRYPTION_KEY || '',
    issuer: process.env.MFA_ISSUER || 'Resolve',
  },

  passwordReset: {
    tokenTtlSeconds: Number(process.env.PASSWORD_RESET_TOKEN_TTL_SECONDS || 1800), // ~30 min, Contract §8
  },
};

module.exports = config;
