const crypto = require('crypto');
const config = require('../config');
const { getRedisClient } = require('../redis/client');
const keys = require('../redis/keys');
const totp = require('./totp');
const { fromCode } = require('../errors/AppError');

const ENROLLMENT_TTL = 600;
const CHALLENGE_TTL = 300;
const MAX_CHALLENGE_ATTEMPTS = 5;

function encryptionKey() {
  const encoded = config.mfa.encryptionKey;
  if (!encoded) throw fromCode('DEPENDENCY_UNAVAILABLE', 'MFA encryption is not configured.');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw fromCode('DEPENDENCY_UNAVAILABLE', 'MFA encryption key must be 32 bytes encoded as base64.');
  return key;
}

function encryptSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    data: ciphertext.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function decryptSecret(encrypted) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(encrypted.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function userKey(userId, tenantId) {
  return keys.mfaAccount(`${tenantId}:${userId}`);
}

async function getAccount(userId, tenantId) {
  const raw = await getRedisClient().get(userKey(userId, tenantId));
  return raw ? JSON.parse(raw) : null;
}

async function beginEnrollment({ userId, tenantId, email }) {
  const redis = getRedisClient();
  const existing = await getAccount(userId, tenantId);
  if (existing?.enabled) throw fromCode('AUTH_MFA_ALREADY_ENABLED', 'MFA is already enabled.');
  const secret = totp.generateSecret();
  const pendingKey = keys.mfaEnrollment(`${tenantId}:${userId}`);
  await redis.set(pendingKey, JSON.stringify({ secret: encryptSecret(secret), email }), 'EX', ENROLLMENT_TTL);
  return {
    secret,
    otpauthUrl: totp.provisioningUri({ secret, email, issuer: config.mfa.issuer }),
    expiresIn: ENROLLMENT_TTL,
    setupInstructions: 'Add this account in your authenticator app by scanning a QR code rendered from the provisioning URI by your client, or enter the secret manually.',
  };
}

async function confirmEnrollment({ userId, tenantId, code }) {
  const redis = getRedisClient();
  const pendingKey = keys.mfaEnrollment(`${tenantId}:${userId}`);
  const raw = await redis.get(pendingKey);
  if (!raw) throw fromCode('AUTH_MFA_CHALLENGE_EXPIRED', 'MFA enrollment has expired. Start enrollment again.');
  const attemptsKey = keys.mfaEnrollmentAttempts(`${tenantId}:${userId}`);
  const attempts = await redis.incr(attemptsKey);
  if (attempts === 1) await redis.expire(attemptsKey, ENROLLMENT_TTL);
  if (attempts > MAX_CHALLENGE_ATTEMPTS) {
    await redis.del(pendingKey, attemptsKey);
    throw fromCode('AUTH_MFA_CHALLENGE_EXPIRED', 'MFA enrollment attempts exceeded. Start enrollment again.');
  }
  const pending = JSON.parse(raw);
  const secret = decryptSecret(pending.secret);
  const counter = totp.verifyCode(secret, code);
  if (counter === null) throw fromCode('AUTH_MFA_INVALID_CODE', 'Authenticator code is invalid.');
  const record = {
    enabled: true,
    secret: pending.secret,
    email: pending.email,
    enabledAt: new Date().toISOString(),
    lastCounter: counter,
  };
  await redis.set(userKey(userId, tenantId), JSON.stringify(record));
  await redis.del(pendingKey, attemptsKey);
}

async function isEnabled(userId, tenantId) {
  const record = await getAccount(userId, tenantId);
  return Boolean(record?.enabled);
}

async function createChallenge({ userId, tenantId, email }) {
  const redis = getRedisClient();
  const token = crypto.randomBytes(32).toString('base64url');
  await redis.set(keys.mfaChallenge(token), JSON.stringify({ userId, tenantId, email }), 'EX', CHALLENGE_TTL);
  return { mfaRequired: true, mfaChallengeToken: token, expiresIn: CHALLENGE_TTL };
}

async function verifyChallenge({ token, code }) {
  const redis = getRedisClient();
  const challengeKey = keys.mfaChallenge(token);
  const raw = await redis.get(challengeKey);
  if (!raw) throw fromCode('AUTH_MFA_CHALLENGE_EXPIRED', 'MFA challenge is invalid or expired.');
  const challenge = JSON.parse(raw);
  const attemptsKey = keys.mfaAttempts(token);
  const attempts = await redis.incr(attemptsKey);
  if (attempts === 1) await redis.expire(attemptsKey, CHALLENGE_TTL);
  if (attempts > MAX_CHALLENGE_ATTEMPTS) {
    await redis.del(challengeKey, attemptsKey);
    throw fromCode('AUTH_MFA_CHALLENGE_EXPIRED', 'MFA challenge has expired. Please log in again.');
  }
  const record = await getAccount(challenge.userId, challenge.tenantId);
  if (!record?.enabled) throw fromCode('AUTH_MFA_CHALLENGE_EXPIRED', 'MFA challenge is invalid or expired.');
  const secret = decryptSecret(record.secret);
  const counter = totp.verifyCode(secret, code);
  if (counter === null) throw fromCode('AUTH_MFA_INVALID_CODE', 'Authenticator code is invalid.');
  if (counter <= Number(record.lastCounter ?? -1)) {
    throw fromCode('AUTH_MFA_INVALID_CODE', 'This authenticator code has already been used.');
  }
  const replayKey = keys.mfaReplay(challenge.tenantId, challenge.userId, counter);
  const accepted = await redis.set(replayKey, '1', 'NX', 'EX', 90);
  if (!accepted) throw fromCode('AUTH_MFA_INVALID_CODE', 'This authenticator code has already been used.');
  record.lastCounter = counter;
  await redis.set(userKey(challenge.userId, challenge.tenantId), JSON.stringify(record));
  await redis.del(challengeKey, attemptsKey);
  return { userId: challenge.userId, tenantId: challenge.tenantId, email: challenge.email };
}


async function verifyCurrentCode({ userId, tenantId, code }) {
  const record = await getAccount(userId, tenantId);
  if (!record?.enabled) throw fromCode('AUTH_MFA_INVALID_CODE', 'MFA is not enabled for this account.');
  const secret = decryptSecret(record.secret);
  const counter = totp.verifyCode(secret, code);
  if (counter === null || counter <= Number(record.lastCounter ?? -1)) {
    throw fromCode('AUTH_MFA_INVALID_CODE', 'Authenticator code is invalid or has already been used.');
  }
  const accepted = await getRedisClient().set(keys.mfaReplay(tenantId, userId, counter), '1', 'NX', 'EX', 90);
  if (!accepted) throw fromCode('AUTH_MFA_INVALID_CODE', 'This authenticator code has already been used.');
  record.lastCounter = counter;
  await getRedisClient().set(userKey(userId, tenantId), JSON.stringify(record));
}

async function disable({ userId, tenantId }) {
  await getRedisClient().del(userKey(userId, tenantId));
}

async function status(userId, tenantId) {
  const record = await getAccount(userId, tenantId);
  return { enabled: Boolean(record?.enabled), enabledAt: record?.enabledAt || null };
}

module.exports = { beginEnrollment, confirmEnrollment, isEnabled, createChallenge, verifyChallenge, verifyCurrentCode, disable, status };
