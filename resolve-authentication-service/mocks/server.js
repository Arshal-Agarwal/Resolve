/**
 * Local stand-in for User & Team Service + Organization Service.
 *
 * This exists ONLY so Auth Service can be built and tested before those
 * teammates' services are deployed/reachable. It implements exactly the
 * internal endpoints and response shapes documented in
 * Contracts/Authentication_Service.md §14 ("Outbound Contracts — Endpoints
 * This Service Calls"). Nothing here is a source of truth — if a teammate's
 * real service disagrees with this, the contract doc is the tiebreaker;
 * file it as a cross-team issue rather than quietly special-casing the
 * client code to match whatever the real service happens to do.
 *
 * Run standalone: `npm run mocks` (listens on :4100 for User&Team paths
 * and :4200 for Organization paths, matching .env.example defaults).
 */
const express = require('express');

const FIXTURE_ORG = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  name: 'Acme Bank',
  slug: 'acme-bank',
  status: 'ACTIVE',
};

const FIXTURE_USER = {
  id: '9e1071ea-9a3b-4a2f-9e2e-1a2b3c4d5e6f',
  organizationId: FIXTURE_ORG.id,
  email: 'jane.doe@acmebank.com',
  status: 'ACTIVE',
  plaintextPassword: 'TempPass!2026', // mock-only convenience, never a real field
};

function buildUserTeamMock() {
  const app = express();
  app.use(express.json());

  // GET /internal/v1/users/lookup?organizationId=&email=  — §14.1
  app.get('/internal/v1/users/lookup', (req, res) => {
    const { organizationId, email } = req.query;
    if (organizationId === FIXTURE_USER.organizationId && email === FIXTURE_USER.email) {
      return res.status(200).json({ userId: FIXTURE_USER.id, status: FIXTURE_USER.status });
    }
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  });

  // POST /internal/v1/users/:id/verify-credentials  — §14.2
  app.post('/internal/v1/users/:id/verify-credentials', (req, res) => {
    const { plaintextPassword } = req.body || {};
    if (req.params.id !== FIXTURE_USER.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    const valid = plaintextPassword === FIXTURE_USER.plaintextPassword;
    return res.status(200).json({
      valid,
      status: FIXTURE_USER.status,
      organizationId: FIXTURE_USER.organizationId,
    });
  });

  // PATCH /internal/v1/users/:id/password-hash  — §14.3
  app.patch('/internal/v1/users/:id/password-hash', (req, res) => {
    if (req.params.id !== FIXTURE_USER.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    return res.status(204).send();
  });

  return app;
}

function buildOrganizationMock() {
  const app = express();
  app.use(express.json());

  // GET /internal/v1/organizations/by-slug/:slug  — §14.0
  app.get('/internal/v1/organizations/by-slug/:slug', (req, res) => {
    if (req.params.slug === FIXTURE_ORG.slug) return res.status(200).json(FIXTURE_ORG);
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } });
  });

  return app;
}

/**
 * Mock for RBAC Service's internal authz check (Contracts/RBAC_Service.md
 * §7.1) - used only by auth-service's own test suite for the
 * token-settings endpoint, which needs AUTH_SETTINGS_MANAGE to be granted.
 * A real RBAC Service (with a real Postgres-backed permission catalog) is
 * a separate, fully-tested service in its own right - this stays a thin
 * stand-in scoped to exactly what auth-service needs from it.
 */
const FIXTURE_ADMIN_USER_ID = 'aaaa1111-aaaa-1111-aaaa-111111111111';

function buildRbacMock() {
  const app = express();
  app.use(express.json());

  app.post('/internal/v1/authz/check', (req, res) => {
    const { userId, permission } = req.body || {};
    const allowed = userId === FIXTURE_ADMIN_USER_ID && permission === 'AUTH_SETTINGS_MANAGE';
    return res.status(200).json({ allowed });
  });

  return app;
}

if (require.main === module) {
  const userTeamPort = 4100;
  const organizationPort = 4200;
  const rbacPort = 4300;
  buildUserTeamMock().listen(userTeamPort, () => {
    // eslint-disable-next-line no-console
    console.log(`[mock] User & Team Service listening on :${userTeamPort}`);
  });
  buildOrganizationMock().listen(organizationPort, () => {
    // eslint-disable-next-line no-console
    console.log(`[mock] Organization Service listening on :${organizationPort}`);
  });
  buildRbacMock().listen(rbacPort, () => {
    // eslint-disable-next-line no-console
    console.log(`[mock] RBAC Service listening on :${rbacPort}`);
  });
}

module.exports = {
  buildUserTeamMock,
  buildOrganizationMock,
  buildRbacMock,
  FIXTURE_ORG,
  FIXTURE_USER,
  FIXTURE_ADMIN_USER_ID,
};
