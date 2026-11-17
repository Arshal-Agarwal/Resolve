# Resolve — Authentication Service

Synchronous REST-only service. Owns **no PostgreSQL table** — its only persisted
state is Redis (sessions, revoked tokens, MFA challenges, password-reset tokens,
rate-limit counters) plus its RS256 JWT signing keys. Zero Kafka involvement.

Full API contract, error catalog, and Redis key schema are the frozen source of
truth in the shared docs repo:

- `Contracts/Authentication_Service.md`
- `Schemas/01_Authentication_Service_Schema.md`
- `Contracts/kafka.md` (confirms this service has no Kafka topics)

This repo must stay consistent with those documents. If a change here requires
a contract change, that's a cross-team conversation first, a code change second.

## Stack

- Node.js 20 LTS, plain JavaScript (CommonJS), Express
- Redis via `ioredis`
- JWT/JWKS via `jose` (RS256)
- Jest + Supertest for tests, `ioredis-mock` / `nock` for isolating dependencies
- ESLint (flat config) + Prettier

## Dependency services

This service calls **User & Team Service** (credential verification, password
hashing), **Organization Service** (slug → org resolution), and **RBAC
Service** (permission checks for `/api/v1/auth/token-settings`) over internal
HTTP. `rbac-service` is a real, separately-built sibling service (not a
paper contract) — see its own repo. User & Team / Organization are still
being built in parallel by other teams. To avoid blocking on their
availability:

- `USE_MOCKS=true` (default, see `.env.example`) routes User & Team /
  Organization calls to a local mock server (`mocks/server.js`) that
  implements exactly the request/response shapes frozen in
  `Contracts/Authentication_Service.md` §14. The same file also includes a
  lightweight RBAC mock (`buildRbacMock`), scoped to exactly what this
  service needs from RBAC — the real `rbac-service` is a fully independent,
  fully tested service in its own right, not something this mock replaces.
- Flip to `USE_MOCKS=false` and set `USER_TEAM_SERVICE_URL` /
  `ORGANIZATION_SERVICE_URL` once the real services are reachable — no other
  code changes should be needed if the real services match the contract.
  `RBAC_SERVICE_URL` points at a real `rbac-service` instance by default
  (`http://localhost:4300`) since that service already exists and was
  verified running alongside this one.
- **If a real service's behavior ever disagrees with the mock, the contract
  doc is the tiebreaker** — file it as a cross-team issue rather than quietly
  special-casing the client code.

## API docs (Swagger)

Once the server is running, open **http://localhost:4001/docs** for interactive
Swagger UI, or fetch the raw spec at `/docs.json`. The spec
(`docs/openapi.yaml`) covers every endpoint in the frozen contract, not just
what's implemented — each path is tagged `x-status: implemented` or
`x-status: planned` (with `x-phase`) so it's always clear what you can
actually call right now versus what's coming in a later phase.

## Getting started

```bash
cp .env.example .env
npm install
npm run mocks    # terminal 1 — starts stub User&Team + Organization services
npm run dev      # terminal 2 — starts auth-service with reload
curl http://localhost:4001/health
```

Or the whole stack in one shot:

```bash
docker compose up --build
```

## Scripts

| Command                                  | Purpose                                      |
| ---------------------------------------- | -------------------------------------------- |
| `npm run dev`                            | Start with hot reload                        |
| `npm start`                              | Start (production mode)                      |
| `npm run mocks`                          | Start the stub User&Team/Organization server |
| `npm test`                               | Run all tests                                |
| `npm run test:unit` / `test:integration` | Run a subset                                 |
| `npm run lint` / `lint:fix`              | ESLint                                       |
| `npm run format` / `format:check`        | Prettier                                     |

## Project layout

```
src/
  config/       env loading + validation
  routes/       Express routers (thin — delegate to controllers)
  controllers/  request/response glue
  services/     business logic (Phase 2+: login, tokens, MFA, password reset)
  clients/      outbound HTTP clients to User&Team / Organization services
  redis/        Redis key builders + connection (Phase 1)
  middleware/   requestContext, error handling, auth guards
  errors/       AppError + error-code catalog (Contracts §12)
  keys/         JWT signing keys (git-ignored) + secretsProvider.js (swap point for a real secrets backend)
mocks/          Stand-in for dependency services — see above
tests/
  unit/
  integration/
```

## Status

**Phase 0 — Project setup: complete.**
Express skeleton, health endpoints, error/logging conventions, mock dependency
server, Docker Compose, CI, lint/format all in place and passing.

**Phase 1 — Redis + JWKS + API docs: complete.**
Redis connection wired to `/health/ready`, key builders per the schema doc,
RS256 signing-key generation/persistence, `/.well-known/jwks.json`, and
Swagger UI at `/docs`.

**Phase 2 — Login, refresh, logout: complete.**
`POST /api/v1/auth/login`, `/refresh`, `/logout` are live, with anti-enumeration
(unknown org/email/wrong-password all look identical), independent
email+IP rate limiting, refresh-token rotation, and access-token revocation
on logout. MFA is intentionally NOT wired into login yet — the contract
itself leaves "how MFA-enrolled is determined" unresolved, and MFA is a
Phase 4 (Could-have) item.

**Phase 3 — Password reset: complete.**
`POST /api/v1/auth/password-reset/request` and `/confirm` are live, now
including rate limiting (previously missing) and full session invalidation
on a successful reset (previously missing) — both found and fixed during a
documentation cross-check against the schema doc's edge-case table.
**Known cross-team gap, still open:** there's no synchronous email/notification
endpoint documented anywhere in this doc set (Notification Service is
consumer-only per `kafka.md`), so reset tokens are generated and stored
correctly but not actually delivered to users yet — see the comment in
`src/services/passwordResetService.js`.

**Secrets-manager readiness: complete.** JWT key storage now goes through
`src/keys/secretsProvider.js`, an explicit interface (`load()`/`persist()`)
with one implementation today (local PEM files, dev-only). Swapping in a
real secrets backend for production means implementing that same interface
once — `keyManager.js` doesn't need to change.

**Token TTL settings (`/api/v1/auth/token-settings`): complete.**
`Contracts/RBAC_Service.md` now exists — a full RBAC Service was built as a
separate, standalone service (`rbac-service`, its own repo, own port,
own Postgres). `GET`/`PATCH /api/v1/auth/token-settings` call RBAC's real
`POST /internal/v1/authz/check` for the `AUTH_SETTINGS_MANAGE` permission.
**Verified with both services actually running together** — a real login
against this service, a real JWT verified by RBAC fetching this service's
real live JWKS endpoint over the network, a real permission grant in RBAC's
Postgres, and a real settings update, not mocked at any layer. Per-tenant
TTL overrides are stored in Redis (`resolve:auth:token-settings:{orgId}`) —
a storage decision the contract itself didn't specify, flagged in
`src/services/tokenSettingsService.js`. The setting has real effect: token
issuance (`tokenService.issueTokenPair`) reads it, it isn't just stored and
ignored.

**On hold: MFA (Phase 4).** No other blockers remain.

### Known open decisions (flagged, not silently resolved)

- **Redis key naming**: two candidate forms exist across the docs — the
  shorter names in `Contracts/Authentication_Service.md` §15 vs. the longer
  hierarchical form in `Schemas/01_Authentication_Service_Schema.md` §4.
  This codebase uses the schema doc's longer form — see `src/redis/keys.js`
  for the reasoning.
- **Disabled-account detection in login**: the contract's Implementation
  Notes and its 403-response description read as slightly inconsistent
  about whether disabled accounts skip credential verification entirely.
  This codebase always verifies credentials first and trusts
  verify-credentials' own `status` field as authoritative — see the comment
  in `src/services/authService.js`.
- **MFA-enrolled flag**: how a service determines a user is MFA-enrolled is
  explicitly left open by the contract. Login currently never branches into
  the MFA-challenge path; that's Phase 4 work once the flag is decided.


## TOTP Multi-Factor Authentication

MFA is optional and is implemented in the Authentication Service using RFC 6238-compatible TOTP codes (six digits, 30-second period). It works with Google Authenticator, Microsoft Authenticator, and compatible authenticator apps. No Google API registration or external OTP provider is required.

### Configuration

Generate a stable 32-byte encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set it as `MFA_ENCRYPTION_KEY` in the service environment. Keep the same value across deployments and restarts; changing it makes existing encrypted TOTP secrets unreadable. Never commit the key.

Redis stores the MFA account record, with the TOTP secret encrypted using AES-256-GCM. The standalone Compose file mounts a named Redis data volume. When using a parent/platform Compose file, ensure its Redis service has persistent storage enabled and pass `MFA_ENCRYPTION_KEY` to the auth-service container.

### API flow

1. Authenticate normally.
2. Call `GET /api/v1/auth/mfa/status` with the access token.
3. Call `POST /api/v1/auth/mfa/enroll` with the access token. The response contains a standard `otpauth://` URI and a Base32 manual-entry secret. Treat this response as sensitive.
4. Add the account to an authenticator app by scanning a QR generated by your client from the provisioning URI, or enter the secret manually.
5. Call `POST /api/v1/auth/mfa/enroll/confirm` with `{ "code": "123456" }`.
6. On subsequent logins, an enrolled user receives HTTP 202 with `mfaRequired` and `mfaChallengeToken`. Call `POST /api/v1/auth/mfa/verify` with the challenge token and current code to receive the normal token pair.
7. To disable MFA, call `POST /api/v1/auth/mfa/disable` with the current password and a fresh TOTP code.

Enrollment secrets are pending for 10 minutes. Login challenges expire after 5 minutes and permit at most five attempts. TOTP codes are protected against reuse.

### Swagger

Open `/docs/` or `/docs.json` on the Auth Service. The MFA status, enrollment, confirmation, login verification, and disable operations are documented.

### Current scope

Recovery codes and a server-rendered QR image are not included in this initial implementation. The API returns the standard provisioning URI and manual-entry key; a frontend can render the URI as a QR code locally without sending the secret to a third-party QR service.


### Parent/platform Compose integration

If this service is launched from the Resolve platform's root Compose file (rather than this service's standalone Compose file), add the following to the `auth-service` environment:

```yaml
      - MFA_ENCRYPTION_KEY=${MFA_ENCRYPTION_KEY}
      - MFA_ISSUER=${MFA_ISSUER:-Resolve}
```

Also ensure the platform's shared Redis service uses a persistent named volume mounted at `/data`. The root `.env` must contain a stable `MFA_ENCRYPTION_KEY` generated using the command above. Do not put the key in source control.
