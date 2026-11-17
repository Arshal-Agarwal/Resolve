/**
 * Starts only the User & Team and Organization mocks (skips the RBAC mock
 * from server.js's default require.main block). Use this instead of
 * `node mocks/server.js` whenever a REAL rbac-service is running alongside
 * this service — both default to listening on :4300, so running both at
 * once collides. See docker-compose.yml in the combined
 * resolve-platform setup, or README's "Dependency services" section.
 */
const { buildUserTeamMock, buildOrganizationMock } = require('./server');

buildUserTeamMock().listen(4100, () => {
  // eslint-disable-next-line no-console
  console.log('[mock] User & Team Service listening on :4100');
});
buildOrganizationMock().listen(4200, () => {
  // eslint-disable-next-line no-console
  console.log('[mock] Organization Service listening on :4200');
});
