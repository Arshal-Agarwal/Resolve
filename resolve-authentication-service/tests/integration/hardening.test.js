const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

/**
 * Regression tests for bugs found by the exhaustive end-to-end run:
 * malformed/oversized bodies surfacing as 500, refresh-token double-spend,
 * and logout deleting other users' refresh sessions.
 */
describe('hardening regressions', () => {
  let tmpDir;
  let app;
  let tokenService;
  let redis;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-keys-'));
    const config = require('../../src/config');
    config.jwt.privateKeyPath = path.join(tmpDir, 'private.pem');
    config.jwt.publicKeyPath = path.join(tmpDir, 'public.pem');
    app = require('../../src/app')();
    tokenService = require('../../src/services/tokenService');
    redis = require('../../src/redis/client').getRedisClient();
  });

  afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it('malformed JSON -> 400 AUTH_VALIDATION_ERROR and still carries a requestId', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('AUTH_VALIDATION_ERROR');
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('oversized body -> 413 PAYLOAD_TOO_LARGE', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a'.repeat(200000) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('a refresh token can be consumed exactly once even under concurrent use (no double-spend)', async () => {
    const pair = await tokenService.issueTokenPair({
      userId: 'u-race',
      organizationId: 'o-1',
      email: 'r@x.test',
    });
    const results = await Promise.all(
      Array.from({ length: 10 }, () => tokenService.rotateRefreshToken(pair.refreshToken)),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("logout cannot delete another user's refresh session", async () => {
    const victim = await tokenService.issueTokenPair({
      userId: 'victim',
      organizationId: 'o-1',
      email: 'v@x.test',
    });
    const deleted = await tokenService.deleteRefreshToken(victim.refreshToken, 'attacker');
    expect(deleted).toBe(false);
    expect(await redis.exists(`resolve:auth:refresh:${victim.refreshToken}`)).toBe(1);
  });

  it('a user CAN delete their own refresh session', async () => {
    const own = await tokenService.issueTokenPair({
      userId: 'owner',
      organizationId: 'o-1',
      email: 'o@x.test',
    });
    expect(await tokenService.deleteRefreshToken(own.refreshToken, 'owner')).toBe(true);
    expect(await redis.exists(`resolve:auth:refresh:${own.refreshToken}`)).toBe(0);
  });

  it('an unreachable Redis surfaces as 503 DEPENDENCY_UNAVAILABLE, not a bare 500', async () => {
    const express = require('express');
    const requestContext = require('../../src/middleware/requestContext');
    const { errorHandler } = require('../../src/middleware/errorHandler');
    const probe = express();
    probe.use(requestContext);
    probe.get('/boom', (req, res, next) => {
      const err = new Error('Reached the max retries per request limit (which is 3).');
      err.name = 'MaxRetriesPerRequestError';
      next(err);
    });
    probe.get('/bug', (req, res, next) => next(new Error('genuine bug')));
    probe.use(errorHandler);

    const outage = await request(probe).get('/boom');
    expect(outage.status).toBe(503);
    expect(outage.body.error.code).toBe('DEPENDENCY_UNAVAILABLE');
    // ...while an ordinary unexpected error must still be a 500.
    expect((await request(probe).get('/bug')).status).toBe(500);
  });
});
