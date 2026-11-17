const config = require('../config');
const { getRedisClient } = require('../redis/client');
const redisKeys = require('../redis/keys');

function windowFor(windowSeconds) {
  // Fixed-window counter.
  return Math.floor(Date.now() / 1000 / windowSeconds);
}

function normalizeEmail(email) {
  // Schema §5.6: "do not allow an attacker to bypass the limit by changing
  // casing of email" — normalize before every rate-limit lookup.
  return String(email).trim().toLowerCase();
}

async function incrementAndCheck(key, windowSeconds) {
  const redis = getRedisClient();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return count;
}

/**
 * Generic email+ip rate-limit check. Both counters are checked
 * independently — either one tripping is enough to block the request
 * (Contract §2). Used by both login and password-reset/request, per
 * Schema §13 item 7 ("rate limiting is mandatory for login AND reset
 * endpoints" — password-reset previously had no limit at all here).
 */
async function checkRateLimit({ emailKey, ipKey, windowSeconds, maxAttempts }) {
  const [emailCount, ipCount] = await Promise.all([
    incrementAndCheck(emailKey, windowSeconds),
    incrementAndCheck(ipKey, windowSeconds),
  ]);

  const limited = emailCount > maxAttempts || ipCount > maxAttempts;
  return { limited, retryAfterSeconds: windowSeconds };
}

async function checkLoginRateLimit(email, ip) {
  const windowSeconds = config.rateLimit.loginWindowSeconds;
  const window = windowFor(windowSeconds);
  return checkRateLimit({
    emailKey: redisKeys.loginRateLimitByEmail(normalizeEmail(email), window),
    ipKey: redisKeys.loginRateLimitByIp(ip, window),
    windowSeconds,
    maxAttempts: config.rateLimit.loginMaxAttempts,
  });
}

async function checkPasswordResetRateLimit(email, ip) {
  const windowSeconds = config.rateLimit.passwordResetWindowSeconds;
  const window = windowFor(windowSeconds);
  return checkRateLimit({
    emailKey: redisKeys.passwordResetRateLimitByEmail(normalizeEmail(email), window),
    ipKey: redisKeys.passwordResetRateLimitByIp(ip, window),
    windowSeconds,
    maxAttempts: config.rateLimit.passwordResetMaxAttempts,
  });
}

module.exports = { checkLoginRateLimit, checkPasswordResetRateLimit, normalizeEmail };
