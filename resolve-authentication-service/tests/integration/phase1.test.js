const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

describe('Phase 1 integration: JWKS, health/ready, Swagger', () => {
  let tmpDir;
  let app;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-keys-'));
    const config = require('../../src/config');
    config.jwt.privateKeyPath = path.join(tmpDir, 'private.pem');
    config.jwt.publicKeyPath = path.join(tmpDir, 'public.pem');

    const createApp = require('../../src/app');
    app = createApp();
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('GET /health/ready returns 200 with ioredis-mock standing in for Redis', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.checks.redis).toBe('ok');
  });

  it('GET /.well-known/jwks.json returns a valid JWKS document, no auth required', async () => {
    const res = await request(app).get('/.well-known/jwks.json');
    expect(res.status).toBe(200);
    expect(res.body.keys).toHaveLength(1);
    expect(res.body.keys[0]).toMatchObject({ kty: 'RSA', alg: 'RS256', use: 'sig' });
  });

  it('GET /docs.json serves the parsed OpenAPI spec', async () => {
    const res = await request(app).get('/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.info.title).toMatch(/Authentication Service/);
    expect(res.body.paths).toHaveProperty('/api/v1/auth/login');
  });

  it('GET /docs serves the Swagger UI HTML page', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});
