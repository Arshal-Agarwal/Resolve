const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

describe('Phase 3 integration: password reset (Contract §8)', () => {
  let tmpDir;
  let app;
  let userTeamServer;
  let organizationServer;
  let FIXTURE_USER;
  let FIXTURE_ORG;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-keys-'));
    const config = require('../../src/config');
    config.jwt.privateKeyPath = path.join(tmpDir, 'private.pem');
    config.jwt.publicKeyPath = path.join(tmpDir, 'public.pem');

    const mocks = require('../../mocks/server');
    FIXTURE_USER = mocks.FIXTURE_USER;
    FIXTURE_ORG = mocks.FIXTURE_ORG;

    userTeamServer = await new Promise((resolve) => {
      const s = mocks.buildUserTeamMock().listen(0, () => resolve(s));
    });
    organizationServer = await new Promise((resolve) => {
      const s = mocks.buildOrganizationMock().listen(0, () => resolve(s));
    });
    config.dependencies.userTeamServiceUrl = `http://127.0.0.1:${userTeamServer.address().port}`;
    config.dependencies.organizationServiceUrl = `http://127.0.0.1:${organizationServer.address().port}`;

    const createApp = require('../../src/app');
    app = createApp();
  });

  afterAll(async () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    await new Promise((resolve) => userTeamServer.close(resolve));
    await new Promise((resolve) => organizationServer.close(resolve));
  });

  beforeEach(async () => {
    const { getRedisClient } = require('../../src/redis/client');
    await getRedisClient().flushall();
  });

  describe('POST /api/v1/auth/password-reset/request', () => {
    it('returns 202 for a real account', async () => {
      const res = await request(app)
        .post('/api/v1/auth/password-reset/request')
        .send({ email: FIXTURE_USER.email, organizationSlug: FIXTURE_ORG.slug });
      expect(res.status).toBe(202);
      expect(res.body.message).toMatch(/if an account/i);
    });

    it('returns the SAME 202 for an unknown email (anti-enumeration)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/password-reset/request')
        .send({ email: 'nobody@acmebank.com', organizationSlug: FIXTURE_ORG.slug });
      expect(res.status).toBe(202);
    });

    it('returns the SAME 202 for an unknown organization (anti-enumeration)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/password-reset/request')
        .send({ email: FIXTURE_USER.email, organizationSlug: 'no-such-org' });
      expect(res.status).toBe(202);
    });

    it('rejects a malformed body with AUTH_VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/password-reset/request')
        .send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('AUTH_VALIDATION_ERROR');
    });

    it('actually stores a reset token in Redis for a real account (verified via internal Redis lookup, not just the HTTP response)', async () => {
      const { getRedisClient } = require('../../src/redis/client');
      const redisKeys = require('../../src/redis/keys');

      await request(app)
        .post('/api/v1/auth/password-reset/request')
        .send({ email: FIXTURE_USER.email, organizationSlug: FIXTURE_ORG.slug });

      const redis = getRedisClient();
      const keys = await redis.keys(`${redisKeys.passwordResetToken('*')}`);
      expect(keys.length).toBe(1);
      const stored = JSON.parse(await redis.get(keys[0]));
      expect(stored.userId).toBe(FIXTURE_USER.id);
    });
  });

  describe('POST /api/v1/auth/password-reset/confirm', () => {
    async function requestTokenAndExtractIt() {
      const { getRedisClient } = require('../../src/redis/client');
      const redisKeys = require('../../src/redis/keys');

      await request(app)
        .post('/api/v1/auth/password-reset/request')
        .send({ email: FIXTURE_USER.email, organizationSlug: FIXTURE_ORG.slug });

      const redis = getRedisClient();
      const keys = await redis.keys(`${redisKeys.passwordResetToken('*')}`);
      const prefix = redisKeys.passwordResetToken('');
      return keys[0].replace(prefix, '');
    }

    it('accepts a valid reset token and consumes it (single-use)', async () => {
      const resetToken = await requestTokenAndExtractIt();

      const confirmRes = await request(app)
        .post('/api/v1/auth/password-reset/confirm')
        .send({ resetToken, newPassword: 'BrandNewPass!2027' });
      expect(confirmRes.status).toBe(204);

      const reuseRes = await request(app)
        .post('/api/v1/auth/password-reset/confirm')
        .send({ resetToken, newPassword: 'AnotherOne!2027' });
      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.error.code).toBe('AUTH_RESET_TOKEN_INVALID');
    });

    it('rejects an unknown reset token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/password-reset/confirm')
        .send({ resetToken: 'not-a-real-token', newPassword: 'BrandNewPass!2027' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('AUTH_RESET_TOKEN_INVALID');
    });

    it('rejects a too-short new password before ever touching Redis', async () => {
      const res = await request(app)
        .post('/api/v1/auth/password-reset/confirm')
        .send({ resetToken: 'irrelevant', newPassword: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('AUTH_VALIDATION_ERROR');
    });
  });
});
