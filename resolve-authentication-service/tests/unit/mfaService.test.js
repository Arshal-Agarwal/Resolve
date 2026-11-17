const crypto = require('crypto');

describe('MFA service', () => {
  let service;
  let redis;
  let config;
  const identity = { userId: 'user-1', tenantId: 'tenant-1', email: 'person@example.com' };

  beforeEach(async () => {
    config = require('../../src/config');
    config.mfa.encryptionKey = crypto.randomBytes(32).toString('base64');
    redis = require('../../src/redis/client').getRedisClient();
    await redis.flushall();
    service = require('../../src/services/mfaService');
  });

  afterAll(async () => {
    await require('../../src/redis/client').closeRedisClient();
  });

  it('enrolls only after a valid TOTP code and stores encrypted secret', async () => {
    const enrollment = await service.beginEnrollment(identity);
    expect(enrollment.otpauthUrl).toContain('otpauth://totp/');
    expect(enrollment.secret).toBeTruthy();
    expect(await service.isEnabled(identity.userId, identity.tenantId)).toBe(false);

    const totp = require('../../src/services/totp');
    const code = totp.codeForCounter(enrollment.secret, Math.floor(Date.now() / 30000));
    await service.confirmEnrollment({ ...identity, code });
    expect(await service.isEnabled(identity.userId, identity.tenantId)).toBe(true);

    const stored = await redis.get(`resolve:auth:mfa:account:${identity.tenantId}:${identity.userId}`);
    expect(stored).not.toContain(enrollment.secret);
  });

  it('requires a valid code to complete a login challenge and rejects replay', async () => {
    const enrollment = await service.beginEnrollment(identity);
    const totp = require('../../src/services/totp');
    const setupCode = totp.codeForCounter(enrollment.secret, Math.floor(Date.now() / 30000));
    await service.confirmEnrollment({ ...identity, code: setupCode });

    // Move to the next TOTP interval to avoid reusing the enrollment code.
    const nextCounter = Math.floor(Date.now() / 30000) + 1;
    const code = totp.codeForCounter(enrollment.secret, nextCounter);
    const challenge = await service.createChallenge(identity);
    const result = await service.verifyChallenge({ token: challenge.mfaChallengeToken, code });
    expect(result.userId).toBe(identity.userId);
    await expect(service.verifyChallenge({ token: challenge.mfaChallengeToken, code }))
      .rejects.toMatchObject({ code: 'AUTH_MFA_CHALLENGE_EXPIRED' });
  });
});
