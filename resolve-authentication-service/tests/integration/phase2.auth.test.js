const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

describe('Phase 2 integration: login, refresh, logout (Contract §5-7)', () => {
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

    // Real HTTP servers, not mocked axios — this proves the actual client
    // code + contract shapes agree, not just that we asserted the right
    // function got called.
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

  describe('POST /api/v1/auth/login', () => {
    it('issues a token pair for correct credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: FIXTURE_USER.email,
        password: FIXTURE_USER.plaintextPassword,
        organizationSlug: FIXTURE_ORG.slug,
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.tokenType).toBe('Bearer');
    });

    it('returns generic AUTH_INVALID_CREDENTIALS for a wrong password (anti-enumeration)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: FIXTURE_USER.email,
        password: 'totally-wrong',
        organizationSlug: FIXTURE_ORG.slug,
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('returns the SAME error code for an unknown organization slug (anti-enumeration)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: FIXTURE_USER.email,
        password: FIXTURE_USER.plaintextPassword,
        organizationSlug: 'no-such-org',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('returns the SAME error code for an unknown email (anti-enumeration)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nobody@acmebank.com',
        password: 'whatever',
        organizationSlug: FIXTURE_ORG.slug,
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('rejects a malformed request body with AUTH_VALIDATION_ERROR', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('AUTH_VALIDATION_ERROR');
    });

    it('rate-limits after repeated failed attempts from the same email+ip', async () => {
      const attempt = () =>
        request(app).post('/api/v1/auth/login').send({
          email: 'ratelimit-target@acmebank.com',
          password: 'wrong',
          organizationSlug: FIXTURE_ORG.slug,
        });

      let lastRes;
      for (let i = 0; i < 11; i += 1) {
        lastRes = await attempt();
      }
      expect(lastRes.status).toBe(429);
      expect(lastRes.body.error.code).toBe('AUTH_RATE_LIMITED');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    beforeEach(async () => {
      // The rate-limit test above deliberately exhausts the IP counter for
      // this test client — flush it so it doesn't leak into unrelated tests.
      const { getRedisClient } = require('../../src/redis/client');
      await getRedisClient().flushall();
    });

    it('rotates a valid refresh token for a new pair, and invalidates the old one', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: FIXTURE_USER.email,
        password: FIXTURE_USER.plaintextPassword,
        organizationSlug: FIXTURE_ORG.slug,
      });
      const { refreshToken } = loginRes.body;

      const refreshRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.refreshToken).not.toBe(refreshToken);

      const reuseRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error.code).toBe('AUTH_INVALID_REFRESH_TOKEN');
    });

    it('rejects an unknown refresh token', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'not-a-real-token' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    beforeEach(async () => {
      const { getRedisClient } = require('../../src/redis/client');
      await getRedisClient().flushall();
    });

    it('requires a valid access token', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_TOKEN');
    });

    it('revokes the access token so it cannot be used again', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: FIXTURE_USER.email,
        password: FIXTURE_USER.plaintextPassword,
        organizationSlug: FIXTURE_ORG.slug,
      });
      const { accessToken } = loginRes.body;

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(logoutRes.status).toBe(204);

      const secondLogoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(secondLogoutRes.status).toBe(401);
      expect(secondLogoutRes.body.error.code).toBe('AUTH_INVALID_TOKEN');
    });

    it('also invalidates the paired refresh token when provided', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: FIXTURE_USER.email,
        password: FIXTURE_USER.plaintextPassword,
        organizationSlug: FIXTURE_ORG.slug,
      });
      const { accessToken, refreshToken } = loginRes.body;

      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      const refreshRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });
  });
});
