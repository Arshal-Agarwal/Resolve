const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

describe('Phase 4 integration: token-settings (Contract §10, RBAC integration)', () => {
  let tmpDir;
  let app;
  let rbacServer;
  let ADMIN_TOKEN;
  let PLAIN_TOKEN;

  const ORG_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const ADMIN_USER_ID = 'aaaa1111-aaaa-1111-aaaa-111111111111';
  const PLAIN_USER_ID = 'bbbb2222-bbbb-2222-bbbb-222222222222';

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-keys-'));
    const config = require('../../src/config');
    config.jwt.privateKeyPath = path.join(tmpDir, 'private.pem');
    config.jwt.publicKeyPath = path.join(tmpDir, 'public.pem');

    const mocks = require('../../mocks/server');
    rbacServer = await new Promise((resolve) => {
      const s = mocks.buildRbacMock().listen(0, () => resolve(s));
    });
    config.dependencies.rbacServiceUrl = `http://127.0.0.1:${rbacServer.address().port}`;

    const createApp = require('../../src/app');
    app = createApp();

    const { issueTokenPair } = require('../../src/services/tokenService');
    ADMIN_TOKEN = (
      await issueTokenPair({ userId: ADMIN_USER_ID, organizationId: ORG_ID, email: 'admin@test' })
    ).accessToken;
    PLAIN_TOKEN = (
      await issueTokenPair({ userId: PLAIN_USER_ID, organizationId: ORG_ID, email: 'plain@test' })
    ).accessToken;
  });

  afterAll(async () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    await new Promise((resolve) => rbacServer.close(resolve));
  });

  it('a user without AUTH_SETTINGS_MANAGE gets 403', async () => {
    const res = await request(app)
      .get('/api/v1/auth/token-settings')
      .set('Authorization', `Bearer ${PLAIN_TOKEN}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('a user with AUTH_SETTINGS_MANAGE can read the default settings', async () => {
    const res = await request(app)
      .get('/api/v1/auth/token-settings')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.organizationId).toBe(ORG_ID);
    expect(res.body.accessTokenTtlSeconds).toBe(3600);
  });

  it('updates the access token TTL, and a subsequent GET reflects it', async () => {
    const patchRes = await request(app)
      .patch('/api/v1/auth/token-settings')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ accessTokenTtlSeconds: 1800 });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.accessTokenTtlSeconds).toBe(1800);

    const getRes = await request(app)
      .get('/api/v1/auth/token-settings')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(getRes.body.accessTokenTtlSeconds).toBe(1800);
  });

  it('the updated TTL actually applies to newly issued tokens, not just the stored setting', async () => {
    const { issueTokenPair } = require('../../src/services/tokenService');
    const pair = await issueTokenPair({ userId: PLAIN_USER_ID, organizationId: ORG_ID, email: 'plain@test' });
    expect(pair.expiresIn).toBe(1800); // was 3600 before the PATCH above
  });

  it('rejects a non-integer accessTokenTtlSeconds', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/token-settings')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ accessTokenTtlSeconds: 'not-a-number' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('AUTH_VALIDATION_ERROR');
  });

  it('requires authentication at all', async () => {
    const res = await request(app).get('/api/v1/auth/token-settings');
    expect(res.status).toBe(401);
  });
});
