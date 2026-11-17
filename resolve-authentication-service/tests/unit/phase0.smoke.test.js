const request = require('supertest');
const createApp = require('../../src/app');

describe('Phase 0 smoke test: service skeleton', () => {
  const app = createApp();

  it('GET /health returns 200 and ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'auth-service' });
  });

  it('GET /health/ready returns 200', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('unknown route returns the contract error shape with 404', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(res.body.error).toHaveProperty('requestId');
    expect(res.body.error).toHaveProperty('traceId');
  });
});

describe('Phase 0 smoke test: mock dependency server (Contract §14)', () => {
  const {
    buildUserTeamMock,
    buildOrganizationMock,
    FIXTURE_ORG,
    FIXTURE_USER,
  } = require('../../mocks/server');

  it('mock Organization Service resolves by slug (§14.0)', async () => {
    const res = await request(buildOrganizationMock()).get(
      `/internal/v1/organizations/by-slug/${FIXTURE_ORG.slug}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: FIXTURE_ORG.id, status: 'ACTIVE' });
  });

  it('mock User & Team Service resolves user lookup (§14.1)', async () => {
    const res = await request(buildUserTeamMock()).get(
      `/internal/v1/users/lookup?organizationId=${FIXTURE_USER.organizationId}&email=${FIXTURE_USER.email}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userId: FIXTURE_USER.id, status: 'ACTIVE' });
  });

  it('mock User & Team Service verifies known credentials (§14.2)', async () => {
    const res = await request(buildUserTeamMock())
      .post(`/internal/v1/users/${FIXTURE_USER.id}/verify-credentials`)
      .send({ plaintextPassword: FIXTURE_USER.plaintextPassword });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('mock User & Team Service rejects wrong password (§14.2)', async () => {
    const res = await request(buildUserTeamMock())
      .post(`/internal/v1/users/${FIXTURE_USER.id}/verify-credentials`)
      .send({ plaintextPassword: 'wrong' });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
  });

  it('mock User & Team Service accepts password-hash update (§14.3)', async () => {
    const res = await request(buildUserTeamMock())
      .patch(`/internal/v1/users/${FIXTURE_USER.id}/password-hash`)
      .send({ newPlaintextPassword: 'NewPass!2027' });
    expect(res.status).toBe(204);
  });
});
