# Resolve Project Structure and Folder Inventory

> This document describes every directory and source/configuration area in the Resolve repository. It is a repository inventory only; no implementation or source-code changes are included.

## 1. Repository overview

The repository contains one frontend application and six implemented or partially implemented backend services, shared platform documentation, infrastructure scripts, and a set of planned services documented but not implemented as code.

Top-level entries:

| Entry | Type | Purpose |
|---|---|---|
| `Audit_Service/` | Backend service | Kafka event ingestion and tenant-scoped audit retrieval |
| `Organization-Service/` | Backend service | Organization/tenant identity and lifecycle |
| `Resolve-User_Team_Service/` | Backend service | User profiles, teams, and team memberships |
| `Resolve_Document_Service/` | Backend service | Document storage, versioning, scanning metadata, and outbox events |
| `Resolve_Documentation/` | Shared documentation | Architecture, SRS, contracts, schemas, Kafka, and task assignments |
| `resolve-authentication-service/` | Backend service | Login, JWTs, refresh/logout, MFA, password reset, and token settings |
| `resolve-rbac-service/` | Backend service | Roles, permissions, user-role assignments, and authorization checks |
| `resolve-web/` | Frontend application | TanStack Start/Lovable case and workflow operations prototype |
| `scripts/` | Infrastructure utility | Kafka topic and DLQ provisioning |
| `FRONTEND_DISCOVERY.md` | Report | Backend and frontend discovery documentation |
| `project.md` | Repository map | This complete folder/file inventory |

## 2. Shared infrastructure script

### `scripts/`

| File | Contents and purpose |
|---|---|
| `create-topics.sh` | Idempotently provisions ten main Resolve Kafka topics and ten matching `.dlq` topics. Main topics use six partitions; DLQ topics use one partition. It uses `rpk` and may be run inside the Redpanda/Kafka container or standalone with Docker exec. |

The script provisions:

- `resolve.case.created`
- `resolve.case.assigned`
- `resolve.case.statuschanged`
- `resolve.case.resolved`
- `resolve.task.created`
- `resolve.task.completed`
- `resolve.document.uploaded`
- `resolve.document.scanned`
- `resolve.approval.requested`
- `resolve.approval.completed`

It also provisions one `.dlq` topic for each of the ten main topics.

## 3. Organization Service

### `Organization-Service/`

Purpose: owns organization/tenant records, organization slug resolution, lifecycle status, public organization APIs, and internal lookup APIs.

Technology: Node.js 20, TypeScript, Express, Prisma, MySQL 8, Redis, Zod, Pino, Vitest, Docker.

Database: service-owned MySQL database. The primary model is `Organization`.

Default local public port: `3000`.

### `Organization-Service/src/`

| File/folder | Contents and purpose |
|---|---|
| `app.ts` | Express app assembly, middleware, routes, health and error integration |
| `server.ts` | Runtime startup, database/Redis lifecycle, migration behavior, and graceful shutdown |
| `config/env.ts` | Environment variable loading and Zod validation |
| `infrastructure/database/prisma.ts` | Prisma database client and connection lifecycle |
| `infrastructure/redis/client.ts` | Redis connection setup |
| `infrastructure/redis/idempotency.ts` | Organization creation idempotency storage |
| `infrastructure/redis/revocation.ts` | Token revocation-state lookup support |
| `middleware/authentication.ts` | Bearer JWT authentication middleware |
| `middleware/authorization.ts` | Public authorization checks |
| `middleware/idempotency.ts` | `Idempotency-Key` middleware |
| `middleware/internal-authentication.ts` | Internal service authentication boundary |
| `middleware/request-id.ts` | Request and trace ID propagation |
| `middleware/security-headers.ts` | Security headers and CORS-related middleware |
| `middleware/validate.ts` | Zod request validation middleware |
| `modules/organization/health.routes.ts` | `/health` and `/health/ready` |
| `modules/organization/internal.routes.ts` | Service-to-service organization lookup routes |
| `modules/organization/organization.controller.ts` | Public HTTP request/response handling |
| `modules/organization/organization.internal.controller.ts` | Internal lookup request/response handling |
| `modules/organization/organization.repository.ts` | Prisma-backed organization database operations |
| `modules/organization/organization.routes.ts` | Public organization route definitions |
| `modules/organization/organization.schemas.ts` | Request and response Zod schemas |
| `modules/organization/organization.service.ts` | Organization business rules |
| `modules/organization/organization.types.ts` | Organization domain and API types |
| `security/auth.types.ts` | JWT and request identity types |
| `security/authorization.ts` | Organization authorization rules |
| `security/internal-auth.ts` | Signed/JWT/HMAC service identity verification |
| `security/jwt.ts` | JWT verification implementation |
| `shared/errors.ts` | Centralized HTTP error types and handling |
| `shared/logger.ts` | Pino structured logging |

### `Organization-Service/prisma/`

| File/folder | Contents and purpose |
|---|---|
| `schema.prisma` | Prisma datasource and `Organization` model |
| `migrations/` | Versioned MySQL schema migrations |

Organization fields include `id`, `name`, unique `slug`, `status`, `createdAt`, and `updatedAt`. Status values are `ACTIVE` and `SUSPENDED`.

### `Organization-Service/docs/`

| File/folder | Contents and purpose |
|---|---|
| `openapi.yaml` | Public and internal organization API contract |
| `phase-1.md` | Phase-one implementation notes |
| `adr/0001-service-stack-and-boundaries.md` | Service stack, database, and boundary decision record |
| `adr/0002-canonical-contract-integration.md` | Canonical contract integration decision record |

### `Organization-Service/tests/`

| Folder | Contents and purpose |
|---|---|
| `unit/` | app, configuration, organization API/service, Redis, resilience, security, and OpenAPI contract tests |
| `integration/` | live database/API/Redis integration tests |
| `e2e/` | organization lifecycle Supertest/E2E tests |

### `Organization-Service/.github/`

Contains the GitHub Actions workflow for MySQL/Redis, migrations, lint, typecheck, tests, and build.

### Organization root configuration files

| File | Purpose |
|---|---|
| `.env.example` | Required and optional development environment variables |
| `docker-compose.yml` | MySQL, Redis, and application container setup |
| `Dockerfile` | Production/container build |
| `package.json` | Scripts and dependencies |
| `package-lock.json` | Reproducible npm dependency lock |
| `tsconfig.json` | TypeScript compiler settings |
| `tsconfig.build.json` | Production build TypeScript settings |
| `vitest.config.ts` | Main Vitest configuration |
| `vitest.unit.config.ts` | Unit test configuration |
| `vitest.integration.config.ts` | Integration test configuration |
| `vitest.e2e.config.ts` | E2E test configuration |
| `eslint.config.mjs` | ESLint rules |
| `.prettierrc` / `.prettierignore` | Formatting configuration |
| `README.md` | Setup, architecture, API, Docker, and CI instructions |

## 4. Authentication Service

### `resolve-authentication-service/`

Purpose: authentication authority. It issues RS256 access/refresh JWTs, manages Redis session and revocation state, supports MFA, password reset, JWKS publication, and per-tenant token settings.

Technology: Node.js 20, plain JavaScript/CommonJS, Express, Redis/ioredis, jose, Jest, Supertest, Docker.

Default local port: `4001`.

### `resolve-authentication-service/src/`

| File/folder | Contents and purpose |
|---|---|
| `app.js` | Express app assembly |
| `server.js` | Runtime startup and listener lifecycle |
| `config/index.js` | Environment loading and validation |
| `routes/auth.routes.js` | Login, refresh, logout, password reset, MFA, and token-settings routes |
| `routes/health.routes.js` | Health and readiness endpoints |
| `routes/jwks.routes.js` | Public JWKS route |
| `controllers/auth.controller.js` | HTTP request/response handling |
| `services/authService.js` | Login/session orchestration |
| `services/tokenService.js` | Access/refresh token creation and rotation |
| `services/mfaService.js` | MFA status, enrollment, confirmation, verification, and disable behavior |
| `services/totp.js` | TOTP implementation |
| `services/passwordResetService.js` | Reset-token request/confirmation and session invalidation |
| `services/rateLimitService.js` | Independent email/IP login and reset rate limiting |
| `services/tokenSettingsService.js` | Per-tenant token TTL settings |
| `clients/userTeamClient.js` | Internal User & Team lookup/credential client |
| `clients/organizationClient.js` | Organization slug/tenant resolution client |
| `clients/rbacClient.js` | RBAC permission checks for token settings |
| `redis/client.js` | Redis connection |
| `redis/keys.js` | Redis key builders for sessions, revocation, MFA, reset tokens, and settings |
| `keys/keyManager.js` | RS256 key loading/persistence coordination |
| `keys/secretsProvider.js` | Secrets-provider abstraction for PEM/JWT keys |
| `middleware/authenticate.js` | Bearer access-token authentication |
| `middleware/requirePermission.js` | Permission middleware |
| `middleware/validateBody.js` | Request body validation |
| `middleware/requestContext.js` | Request ID/context middleware |
| `middleware/errorHandler.js` | Consistent error response handling |
| `errors/AppError.js` | Application error and status/code model |
| `validation/authSchemas.js` | Login, reset, MFA, and token-setting validation |
| `utils/logger.js` | Structured logging |
| `docs/openapiSpec.js` | Swagger/OpenAPI runtime spec generation |

### `resolve-authentication-service/docs/`

| File | Purpose |
|---|---|
| `openapi.yaml` | Frozen public API contract; includes live and planned endpoint labels |

### `resolve-authentication-service/mocks/`

Contains local/mock User & Team, Organization, and RBAC dependencies for isolated development and tests.

### `resolve-authentication-service/tests/`

| Folder | Purpose |
|---|---|
| `unit/` | key, Redis, MFA/TOTP, secrets-provider, and smoke tests |
| `integration/` | hardening and live authentication-flow, password-reset, and token-setting integration tests |
| `setup/` | mock Redis and quiet-log test setup |

### Authentication root configuration

| File | Purpose |
|---|---|
| `.env.example` | Runtime/development placeholders |
| `docker-compose.yml` | Auth service, Redis, and mock dependencies |
| `Dockerfile` | Container build |
| `docs/openapi.yaml` | API contract |
| `package.json` / `package-lock.json` | Scripts and dependency lock |
| `jest.config.js` | Jest configuration |
| `eslint.config.js` | ESLint configuration |
| `.nvmrc` / `.prettierrc` | Runtime and formatting configuration |
| `.github/workflows/ci.yml` | Redis-backed CI workflow |
| `README.md` | Setup, implementation status, dependencies, and known gaps |

## 5. RBAC Service

### `resolve-rbac-service/`

Purpose: owns permissions, roles, role-to-permission assignments, user-role assignments, effective permissions, and internal authorization checks.

Technology: Node.js 20, JavaScript/CommonJS, Express, PostgreSQL/`pg`, Redis cache, jose/JWKS, Jest, Docker.

Default local port: `4300`.

Database: dedicated PostgreSQL database.

### `resolve-rbac-service/src/`

| File/folder | Contents and purpose |
|---|---|
| `app.js` | Express application assembly |
| `server.js` | Server startup |
| `config/index.js` | Environment loading and validation |
| `db/pool.js` | PostgreSQL pool and health checks |
| `cache/client.js` | Redis cache client |
| `cache/permissionCache.js` | Flattened permission cache and invalidation behavior |
| `routes/rbac.routes.js` | Public permission and role/user-role routes |
| `routes/authz.routes.js` | Internal hot-path and bulk authorization routes |
| `routes/health.routes.js` | Health and readiness routes |
| `controllers/rbac.controller.js` | RBAC HTTP handling |
| `controllers/authz.controller.js` | Internal authorization HTTP handling |
| `services/permissionService.js` | Permission lookup and evaluation |
| `services/roleService.js` | Role CRUD and system-role rules |
| `services/userRoleService.js` | User role assignment/revocation |
| `middleware/authenticate.js` | Public JWT verification |
| `middleware/internalAuth.js` | Internal service token authentication |
| `middleware/requirePermission.js` | Permission enforcement middleware |
| `middleware/requestContext.js` | Request IDs and context |
| `middleware/validateBody.js` | Request validation |
| `middleware/errorHandler.js` | Error response handling |
| `errors/AppError.js` | Application error model |
| `validation/schemas.js` | Role and authorization request schemas |
| `utils/logger.js` | Structured logging |
| `docs/openapiSpec.js` | Runtime OpenAPI spec |

### `resolve-rbac-service/migrations/`

| File | Purpose |
|---|---|
| `1700000000000_create-rbac-tables.js` | Creates `permissions`, `roles`, `role_permissions`, and `user_roles`; includes unique constraints and cross-service `user_roles` references |
| `1700000000001_seed-permissions-and-roles.js` | Seeds the permission catalog and global `ORG_ADMIN` / `CASE_MANAGER` system roles |

Important database behavior:

- `roles.organization_id` is nullable for global system roles.
- `user_roles.user_id` is a cross-service reference and has no real foreign key to the User Service.
- Role names are unique within a tenant or within global system roles using partial indexes.
- Redis is a cache only, never the source of truth.

### `resolve-rbac-service/docs/`

| File | Purpose |
|---|---|
| `openapi.yaml` | Public/internal RBAC API contract |

### `resolve-rbac-service/mocks/`

Contains mock JWKS server behavior and local access-token signing helpers.

### `resolve-rbac-service/tests/`

| Folder | Purpose |
|---|---|
| `unit/seedData.test.js` | Permission catalog and seeded-role validation |
| `integration/hardening.test.js` | Security and hardening tests |
| `integration/rbac.test.js` | Full authenticated RBAC flow, cache invalidation, and anti-enumeration tests |
| `setup/` | Mock Redis and quiet logs |

### RBAC root configuration

| File | Purpose |
|---|---|
| `.env.example` | Database, Redis, JWKS, and internal-auth settings |
| `docker-compose.yml` | RBAC app, PostgreSQL, Redis, and migrations |
| `Dockerfile` | Container build |
| `package.json` / `package-lock.json` | npm scripts and lock |
| `jest.config.js` | Jest setup |
| `eslint.config.js` | ESLint rules |
| `README.md` | Architecture, setup, status, and known gaps |

## 6. User & Team Service

### `Resolve-User_Team_Service/`

Purpose: owns user profile records, teams, team memberships, and protected internal credential lookup/hash operations.

Technology: Node.js 20, JavaScript/CommonJS, Express, PostgreSQL, bcryptjs, jose, Zod-style validation, Jest, Supertest, Docker.

Default local public port: `8080`.

### `Resolve-User_Team_Service/src/`

| File/folder | Contents and purpose |
|---|---|
| `app.js` | Express app assembly |
| `server.js` | Server startup and migration execution |
| `db/pool.js` | PostgreSQL pool |
| `db/migrate.js` | Migration runner |
| `users/users.routes.js` | Public user routes |
| `users/users.controller.js` | Public user HTTP handling |
| `users/users.repository.js` | PostgreSQL user operations |
| `users/users.validation.js` | User request validation |
| `teams/teams.routes.js` | Team and membership routes |
| `teams/teams.controller.js` | Team HTTP handling |
| `teams/teams.repository.js` | PostgreSQL team and membership operations |
| `teams/teams.validation.js` | Team/membership request validation |
| `internal/internal.routes.js` | Protected internal routes |
| `internal/internal.controller.js` | Credential lookup/hash operations |
| `internal/internal.validation.js` | Internal request validation |
| `organization/organizationClient.js` | Organization existence/status lookup |
| `middleware/authenticate.js` | JWT authentication |
| `middleware/authorize.js` | Permission claim enforcement |
| `middleware/idempotency.js` | Idempotency key handling |
| `middleware/errorHandler.js` | Centralized HTTP errors |
| `security/jwt.js` | Access-token verification |
| `security/serviceAuth.js` | mTLS/internal signed-JWT service auth |
| `utils/asyncHandler.js` | Async route wrapper |
| `utils/pagination.js` | Pagination/sort parsing |

### `Resolve-User_Team_Service/migrations/`

| File | Purpose |
|---|---|
| `001_create_users_table.sql` | Creates `users` with tenant, profile, status, password hash, and unique tenant/email and tenant/username constraints |
| `002_create_teams_table.sql` | Creates `teams` with tenant/name uniqueness |
| `003_create_team_members_table.sql` | Creates `team_members` join table with cascade deletion |
| `004_add_performance_indexes.sql` | Adds query performance indexes |

Data entities:

- `users`: id, organization_id, email, username, password_hash, full_name, status, timestamps
- `teams`: id, organization_id, name, timestamps
- `team_members`: team_id, user_id, joined_at

Statuses include `ACTIVE`, `INACTIVE`, and `SUSPENDED`.

### `Resolve-User_Team_Service/tests/`

| File | Purpose |
|---|---|
| `test-setup.js` | Test database/environment setup |
| `test-auth-setup.js` | Authentication test setup |
| `user-team-service.test.js` | Public/internal User & Team service tests |

### User & Team root configuration

| File | Purpose |
|---|---|
| `openapi.yaml` | Public/internal API contract |
| `Integration Guide — User & Team Service` | Integration guidance |
| `docker-compose.yml` | Local PostgreSQL setup |
| `.env.example` | Runtime/development settings |
| `generate-internal-token.js` | Development internal token utility |
| `generate-token.js` | Development access token utility |
| `package.json` / `package-lock.json` | npm scripts and lock |
| `README.md` | Setup, auth, internal routing, and status |

## 7. Document Service

### `Resolve_Document_Service/`

Purpose: stores case document metadata in PostgreSQL, file bytes in S3-compatible storage, version history in PostgreSQL, and publishes `DocumentUploaded` events through a transactional outbox.

Technology: Node.js, Express, PostgreSQL, AWS SDK-compatible S3/SeaweedFS, KafkaJS/Redpanda, Docker.

Default local public port: `3000`.

### `Resolve_Document_Service/src/`

| File/folder | Contents and purpose |
|---|---|
| `app.js` | Express app assembly |
| `index.js` | Service startup and worker startup |
| `routes/documents.js` | Upload, list, metadata, download, and version routes |
| `controllers/documentsController.js` | Multipart and HTTP response handling |
| `services/documentsService.js` | Document and version business logic |
| `services/idempotencyService.js` | Idempotent upload key handling |
| `services/caseClient.js` | Case dependency/validation client |
| `services/permissionClient.js` | Document permission checks |
| `services/s3Client.js` | S3-compatible storage operations |
| `services/scanService.js` | Malware/virus scan integration behavior |
| `kafka/producer.js` | Kafka event publishing |
| `workers/outboxRelay.js` | PENDING outbox publication and retry relay |
| `workers/scanRelay.js` | Scan-status processing worker |
| `middleware/auth.js` | JWT authentication and tenant context |
| `db/pool.js` | PostgreSQL pool |
| `config/env.js` | Environment loading |

### `Resolve_Document_Service/migrations/`

| File | Purpose |
|---|---|
| `001_init.sql` | Creates `documents`, `document_versions`, and `outbox_events` |
| `002_idempotency_keys.sql` | Adds persistent idempotency-key storage |
| `003_document_versions_filename.sql` | Adds and populates version filenames |
| `004_outbox_relay_indexes.sql` | Adds PENDING-outbox indexing for relay polling |

Key entities:

- `documents`: organization/case/comment ownership, uploader, filename, MIME, size, checksum, storage key, scan status, current version
- `document_versions`: document, version number, filename/storage key/checksum/size/uploader
- `outbox_events`: organization, aggregate, event type/version, JSON payload, status, retry count, scheduling timestamps

Scan statuses: `PENDING`, `CLEAN`, `INFECTED`, `FAILED`.

### Document root configuration

| File | Purpose |
|---|---|
| `openapi.yaml` | Upload/download/version API contract |
| `Integration Guide — Document Service` | Integration/deployment notes |
| `docker-compose.yml` | PostgreSQL, SeaweedFS, and Redpanda setup |
| `.env.example` | Database, S3, Kafka, upload, scan, and relay settings |
| `package.json` / `package-lock.json` | npm dependencies and scripts |
| `README.md` | Architecture, setup, API, Kafka, outbox, and known gaps |

## 8. Audit Service

### `Audit_Service/`

Purpose: consumes Resolve domain events from Kafka, persists an append-only tenant audit trail in PostgreSQL, and exposes paginated audit retrieval.

Technology: Node.js 20, TypeScript, Express, Prisma, PostgreSQL, KafkaJS, Redis, Zod, Pino, Jest, Docker.

Default local public port: `3000`.

Runtime status: implemented for ingestion/retrieval infrastructure, but public retrieval denies reads until an Audit-view RBAC adapter/permission contract is connected.

### `Audit_Service/src/`

| File/folder | Contents and purpose |
|---|---|
| `app.ts` | Express app assembly |
| `server.ts` | Kafka/database/Redis startup and shutdown |
| `config/env.ts` | Environment loading |
| `config/validate.ts` | Zod environment validation |
| `infrastructure/database/prisma.ts` | PostgreSQL/Prisma client |
| `infrastructure/kafka/client.ts` | KafkaJS consumers and subscription lifecycle |
| `infrastructure/redis/revocation.ts` | Access-token revocation lookup |
| `middleware/authentication.ts` | Resolve JWT verification |
| `middleware/audit-authorization.ts` | Fail-closed audit authorization adapter |
| `middleware/request-id.ts` | Request ID propagation |
| `middleware/request-logging.ts` | HTTP request logging |
| `modules/audit/audit-event.schema.ts` | Kafka event envelope and metadata validation |
| `modules/audit/audit-ingestion.service.ts` | Validation, idempotency, and ingestion orchestration |
| `modules/audit/audit.repository.ts` | Audit event persistence |
| `modules/audit/audit.types.ts` | Domain event types |
| `modules/audit/audit-query.controller.ts` | Audit retrieval HTTP handling |
| `modules/audit/audit-query.repository.ts` | Filtered/paginated audit queries |
| `modules/audit/audit-query.service.ts` | Audit query business logic |
| `modules/audit/audit-query.schema.ts` | Query/filter/sort validation |
| `modules/audit/audit-query.types.ts` | Audit query result types |
| `modules/audit/audit.routes.ts` | `/api/v1/audit` route |
| `modules/audit/audit.authorization.ts` | Audit authorization contract |
| `modules/health/health.routes.ts` | Liveness/readiness probes |
| `security/auth.types.ts` | JWT identity and tenant types |
| `security/jwt.ts` | JWT verification |
| `shared/errors.ts` | HTTP error model |
| `shared/logger.ts` | Pino logging |
| `types/express.d.ts` | Express type augmentation |

### `Audit_Service/prisma/`

| File/folder | Purpose |
|---|---|
| `schema.prisma` | `AuditLog` and `AuditEventProcessing` models |
| `migrations/` | PostgreSQL audit schema migrations |

Audit records include event ID, tenant, actor, action, event version, resource type/resource ID, timestamp, full payload, old/new values, request/trace IDs, and created time. Processing records retain topic/partition/offset, status, attempts, errors, raw messages, headers, and timestamps.

### `Audit_Service/scripts/`

| Folder/file | Purpose |
|---|---|
| `dummy-events/` | Synthetic Kafka event factories and producers |
| `dummy-events/event-factory.ts` | Generates valid UUIDs, timestamps, metadata, and event envelopes |
| `dummy-events/producer.ts` | Publishes all documented event types, duplicates, and malformed test scenarios |
| `validate-env.ts` | Environment validation utility |

### `Audit_Service/tests/`

| Folder | Purpose |
|---|---|
| `unit/` | app, API, event schema, repository, Kafka, JWT, config, and factory tests |
| `integration/audit-ingestion.integration.test.ts` | Database/Kafka ingestion integration tests |

### Audit root configuration

| File | Purpose |
|---|---|
| `docs/Audit_Service.md` | Detailed implementation and contract documentation |
| `integration.md` | Kafka and cross-service integration guide |
| `compose.yaml` | PostgreSQL and app container setup |
| `.env.example` | Database, Redis, JWT, Kafka, and logging settings |
| `Dockerfile` | Container build |
| `package.json` / `package-lock.json` | npm scripts/dependencies |
| `jest.config.mjs` | Jest configuration |
| `eslint.config.mjs` | ESLint configuration |
| `tsconfig.json` / `tsconfig.build.json` | TypeScript configuration |
| `README.md` | Setup, status, API, Kafka, and operational guidance |

## 9. Shared Resolve Documentation

### `Resolve_Documentation/`

Purpose: canonical cross-service requirements, architecture, contracts, schemas, Kafka event design, task assignment, and implementation phases.

### `Resolve_Documentation/General/`

| File | Contents |
|---|---|
| `SRS.md` | Overall functional and nonfunctional system requirements |
| `Features_Phases.md` | Feature priorities and build phases |
| `Schemas_High_Level.md` | Cross-platform entity and schema overview |
| `System_Architecture.png` | System architecture diagram |

### `Resolve_Documentation/Contracts/`

| File | Contents |
|---|---|
| `Authentication_Service.md` | Authentication API, Redis, token, MFA, reset, error, and security contracts |
| `User_Team_Service.md` | User/team API and ownership contract |
| `Organisation_Service.md` | Organization/tenant contract; spelling differs from folder name but refers to the organization domain |
| `kafka.md` | Canonical topics, event envelope, payload schemas, delivery semantics, partitioning, and DLQ contract |

### `Resolve_Documentation/Schemas/`

| File | Purpose |
|---|---|
| `01_Authentication_Service_Schema.md` | Authentication Redis and data schema |
| `02_User_Team_Service_Schema.md` | User/team data schema |
| `03_Organization_Service_Schema.md` | Organization/tenant data schema |

### `Resolve_Documentation/Architechture_Design_Decisions/`

Reserved for architectural decision records. The directory currently contains only `.gitkeep`, so no decision files are present there.

### Shared documentation root files

| File | Purpose |
|---|---|
| `kafka.md` | Human-readable producer/consumer map and ownership summary |
| `tasks.md` | Nine-service task assignment plan, build sequence, deliverables, dependencies, and cross-service integration tasks |
| `.gitignore` | Documentation repository ignore rules |

## 10. Frontend application

### `resolve-web/`

Purpose: existing Lovable/TanStack Start frontend prototype. It is a case-and-workflow operations console backed by browser `localStorage`, not by Resolve microservices.

Technology: React 19, TanStack Start/Router/Query, TypeScript, Tailwind CSS 4, Radix UI, React Hook Form, Zod, Recharts, Recharts, Vite, Nitro, Lovable integration.

### `resolve-web/src/`

| File/folder | Contents and purpose |
|---|---|
| `routes/index.tsx` | `/` dashboard with local case/workflow metrics and activity |
| `routes/cases.index.tsx` | `/cases` local list/search/filter/create/edit/delete |
| `routes/cases.$id.tsx` | `/cases/:id` stage conveyor and overview/comments/audit/document/approval tabs |
| `routes/workflows.index.tsx` | `/workflows` local workflow list/create/edit/delete |
| `routes/workflows.$id.tsx` | `/workflows/:id` stage/node hierarchical workflow builder |
| `routes/organization.tsx` | `/organization` prototype role/user/team overview |
| `routes/__root.tsx` | Root HTML and provider shell; global error/not-found handling |
| `routes/README.md` | TanStack file-routing conventions |
| `components/Shell.tsx` | Fixed sidebar, breadcrumb header, notification dropdown, action slot |
| `components/bits.tsx` | Modal, field, inputs, buttons, select, textarea, and semantic tag components |
| `components/ui/` | Radix-based reusable UI primitives |
| `lib/resolve-store.tsx` | Complete local prototype store, seed data, types, and mutation methods |
| `lib/error-capture.ts` | Captures browser runtime errors |
| `lib/error-page.ts` | Builds fallback SSR error HTML |
| `lib/lovable-error-reporting.ts` | Lovable error reporting integration |
| `lib/utils.ts` | Shared utility helpers, primarily class-name merging |
| `hooks/use-mobile.tsx` | Responsive/mobile viewport hook |
| `styles.css` | Tailwind imports, theme variables, glass/frosted-console design tokens, animation utilities |
| `router.tsx` | TanStack Router and QueryClient construction |
| `routeTree.gen.ts` | Generated route tree; must not be edited manually |
| `server.ts` | Custom SSR server entry and catastrophic error normalization |
| `start.ts` | TanStack Start request/error middleware and CSRF middleware |

### `resolve-web/src/components/ui/`

Contains wrappers for:

- accordion, alert, alert-dialog
- aspect-ratio, avatar
- badge, breadcrumb, button
- calendar, card, carousel, chart, checkbox
- collapsible, command, context-menu
- dialog, drawer, dropdown-menu
- form, hover-card, input, input-OTP
- label, menubar, navigation-menu
- pagination, popover, progress, radio-group
- resizable, scroll-area, select, separator, sheet
- sidebar, skeleton, slider, sonner/toasts
- switch, table, tabs, textarea, toggle, toggle-group, tooltip

These components are available for future authenticated/admin pages.

### `resolve-web/src/lib/resolve-store.tsx`

Contains the prototype data model:

- `Workflow`, `WorkflowStage`, `WorkflowNode`
- `CaseRecord`, `CaseStatus`
- `Comment`
- `AuditEvent`
- `DocumentRecord`
- `Notification`
- `User`
- `Team`
- `ApprovalRequest`

It includes seeded workflows, cases, comments, audit events, documents, notifications, users, teams, and approval records.

It provides prototype mutations for:

- workflow create/update/delete
- case create/update/delete
- task toggling
- comments
- audit-event creation
- local document creation
- notification read state
- approval approve/reject

Persistence is browser `localStorage` under `resolve.store.v2`.

### `resolve-web/public/`

| File | Purpose |
|---|---|
| `robots.txt` | Search crawler directives |

### `resolve-web/.lovable/`

| File | Purpose |
|---|---|
| `project.json` | Lovable project schema/template metadata |

### `resolve-web` root files

| File | Purpose |
|---|---|
| `package.json` | Frontend dependencies and dev/build/lint/format scripts |
| `package-lock.json` | npm dependency lock |
| `bun.lock` | Bun dependency lock present alongside npm lock |
| `bunfig.toml` | Bun runtime configuration |
| `vite.config.ts` | Lovable/TanStack/Vite integration configuration |
| `tsconfig.json` | TypeScript settings and path aliases |
| `components.json` | shadcn/Radix component generation configuration |
| `eslint.config.js` | ESLint configuration |
| `.prettierrc` / `.prettierignore` | Formatting configuration |
| `AGENTS.md` | Lovable agent and TanStack file-routing instructions |
| `README.md` | Generic Lovable/TanStack setup instructions |
| `RESOLVE_DOCUMENTATION.md` | Existing prototype product description |
| `FRONTEND_IMPLEMENTATION_GUIDE.md` | Backend-grounded frontend implementation plan |

## 11. Cross-service communication map

| Consumer | Dependency | Mechanism |
|---|---|---|
| Authentication | User & Team | Internal/HTTP client for credential and profile lookup |
| Authentication | Organization | Internal/HTTP tenant slug and status lookup |
| Authentication | RBAC | Internal permission checks for token settings |
| User & Team | Organization | Internal organization lookup before creating users/teams |
| Organization | Redis | Idempotency and revocation-state support |
| RBAC | Authentication | JWT verification through live or mocked JWKS |
| Document | RBAC-like permission client | Permission and case checks |
| Audit | Authentication | JWT verification and tenant claim validation |
| Audit | Redis | Token revocation checks |
| Audit | Kafka | Consumes ten canonical domain event topics |
| Document | S3 | Stores file bytes |
| Document | Kafka | Publishes through transactional outbox |

No browser-facing route should call internal service endpoints or use internal service credentials.

## 12. Event architecture

Shared Kafka topics include:

- case lifecycle: created, assigned, status changed, resolved
- task lifecycle: created, completed
- document lifecycle: uploaded, scanned
- approval lifecycle: requested, completed

Each main topic has a matching `.dlq` topic in the provisioning script.

Document events are the clearest implemented outbox example: document metadata and an outbox row commit in one transaction; a relay publishes PENDING rows asynchronously.

Audit consumes all ten canonical domain topics. Case and workflow services are documented as producers but are not present as implemented code in this repository.

## 13. Database ownership

| Service | Database | Main tables/models |
|---|---|---|
| Organization | MySQL | `organizations` |
| Authentication | Redis plus key storage | sessions, revocation, MFA, reset, settings; no owned PostgreSQL/MySQL database |
| User & Team | PostgreSQL | `users`, `teams`, `team_members` |
| RBAC | PostgreSQL | `permissions`, `roles`, `role_permissions`, `user_roles` |
| Document | PostgreSQL + S3 | `documents`, `document_versions`, `outbox_events`, file objects |
| Audit | PostgreSQL | `audit_logs`, `audit_event_processing` |

Cross-service relationships are represented by UUIDs and API contracts, not direct foreign keys or shared SQL databases.

## 14. Implementation-status summary

| Area | Status in repository |
|---|---|
| Organization | Implemented and test-backed |
| Authentication | Implemented through login, refresh, logout, password reset, MFA, JWKS, and token settings |
| RBAC | Implemented and verified for roles, permissions, assignments, cache invalidation, and internal checks |
| User & Team | Implemented public/internal APIs and migrations; can remain partially complete if real cross-service dependencies are unavailable |
| Document | Implemented standalone with upload, versions, S3, outbox, Kafka, and scan-related workers |
| Audit ingestion/retrieval | Implemented, but public retrieval is fail-closed until the Audit RBAC contract is complete |
| Case Management | Documentation/planned only; no service code in this repository |
| Workflow & Work Execution | Documentation/planned only; no service code in this repository |
| Notification | Documentation/planned only; no service code in this repository |
| Frontend | Lovable/TanStack local prototype; no real microservice API integration implemented |

## 15. Frontend-relevant API exposure summary

The current frontend should integrate only the following implemented service surfaces:

- authentication login/refresh/logout/password reset/MFA/token settings
- organization list/detail/create/update/status
- organization internal lookup, browser-prohibited
- user/team public CRUD and membership operations
- user/team internal credential operations, browser-prohibited
- RBAC public permissions/roles/user-role operations
- RBAC internal authorization endpoints, browser-prohibited
- document case upload/list/detail/download/version operations
- audit retrieval, currently blocked by authorization configuration
- health/readiness endpoints for operational UI

The existing workflow/case/approval/comment/notification UI is local prototype functionality and must not be represented as a real backend-connected feature until the corresponding services exist.

## 16. Complete first-level directory inventory

- `Audit_Service/`
- `Organization-Service/`
- `Resolve-User_Team_Service/`
- `Resolve_Document_Service/`
- `Resolve_Documentation/`
- `resolve-authentication-service/`
- `resolve-rbac-service/`
- `resolve-web/`
- `scripts/`

## 17. Full repository file tree

Generated repository inventory below includes source, configuration, tests, migrations, documentation, and frontend files. Dependency directories and `.git` internals are excluded.
`	ext
Resolve/
|-- Audit_Service/
|   |-- docs/
|   |   -- Audit_Service.md
|   |-- prisma/
|   |   |-- migrations/
|   |   |   |-- 20261109183000_create_audit_events/
|   |   |   |   -- migration.sql
|   |   |   |-- 20261109190000_add_kafka_ingestion/
|   |   |   |   -- migration.sql
|   |   |   |-- 20261116190000_reconcile_audit_fields/
|   |   |   |   -- migration.sql
|   |   |   -- migration_lock.toml
|   |   -- schema.prisma
|   |-- scripts/
|   |   |-- dummy-events/
|   |   |   |-- event-factory.ts
|   |   |   -- producer.ts
|   |   -- validate-env.ts
|   |-- src/
|   |   |-- config/
|   |   |   |-- env.ts
|   |   |   -- validate.ts
|   |   |-- infrastructure/
|   |   |   |-- database/
|   |   |   |   -- prisma.ts
|   |   |   |-- kafka/
|   |   |   |   -- client.ts
|   |   |   -- redis/
|   |   |       -- revocation.ts
|   |   |-- middleware/
|   |   |   |-- audit-authorization.ts
|   |   |   |-- authentication.ts
|   |   |   |-- request-id.ts
|   |   |   -- request-logging.ts
|   |   |-- modules/
|   |   |   |-- audit/
|   |   |   |   |-- audit-event.schema.ts
|   |   |   |   |-- audit-ingestion.service.ts
|   |   |   |   |-- audit-query.controller.ts
|   |   |   |   |-- audit-query.repository.ts
|   |   |   |   |-- audit-query.schema.ts
|   |   |   |   |-- audit-query.service.ts
|   |   |   |   |-- audit-query.types.ts
|   |   |   |   |-- audit.authorization.ts
|   |   |   |   |-- audit.repository.ts
|   |   |   |   |-- audit.routes.ts
|   |   |   |   -- audit.types.ts
|   |   |   -- health/
|   |   |       -- health.routes.ts
|   |   |-- security/
|   |   |   |-- auth.types.ts
|   |   |   -- jwt.ts
|   |   |-- shared/
|   |   |   |-- errors.ts
|   |   |   -- logger.ts
|   |   |-- types/
|   |   |   -- express.d.ts
|   |   |-- app.ts
|   |   -- server.ts
|   |-- tests/
|   |   |-- integration/
|   |   |   -- audit-ingestion.integration.test.ts
|   |   -- unit/
|   |       |-- app.test.ts
|   |       |-- audit-api.test.ts
|   |       |-- audit-event.schema.test.ts
|   |       |-- audit-ingestion.service.test.ts
|   |       |-- audit-query.repository.test.ts
|   |       |-- audit-repository.test.ts
|   |       |-- config.test.ts
|   |       |-- dummy-event-factory.test.ts
|   |       |-- jwt.test.ts
|   |       |-- kafka-client.test.ts
|   |       -- kafka.test.ts
|   |-- .dockerignore
|   |-- .env.example
|   |-- .gitignore
|   |-- compose.yaml
|   |-- Dockerfile
|   |-- eslint.config.mjs
|   |-- integration.md
|   |-- jest.config.mjs
|   |-- package-lock.json
|   |-- package.json
|   |-- README.md
|   |-- tsconfig.build.json
|   -- tsconfig.json
|-- Organization-Service/
|   |-- .github/
|   |   -- workflows/
|   |       -- ci.yml
|   |-- docs/
|   |   |-- adr/
|   |   |   |-- 0001-service-stack-and-boundaries.md
|   |   |   -- 0002-canonical-contract-integration.md
|   |   |-- openapi.yaml
|   |   -- phase-1.md
|   |-- prisma/
|   |   |-- migrations/
|   |   |   -- 20260912000000_init/
|   |   |       -- migration.sql
|   |   -- schema.prisma
|   |-- src/
|   |   |-- config/
|   |   |   -- env.ts
|   |   |-- infrastructure/
|   |   |   |-- database/
|   |   |   |   -- prisma.ts
|   |   |   -- redis/
|   |   |       |-- client.ts
|   |   |       |-- idempotency.ts
|   |   |       -- revocation.ts
|   |   |-- middleware/
|   |   |   |-- authentication.ts
|   |   |   |-- authorization.ts
|   |   |   |-- idempotency.ts
|   |   |   |-- internal-authentication.ts
|   |   |   |-- request-id.ts
|   |   |   |-- security-headers.ts
|   |   |   -- validate.ts
|   |   |-- modules/
|   |   |   -- organization/
|   |   |       |-- health.routes.ts
|   |   |       |-- internal.routes.ts
|   |   |       |-- organization.controller.ts
|   |   |       |-- organization.internal.controller.ts
|   |   |       |-- organization.repository.ts
|   |   |       |-- organization.routes.ts
|   |   |       |-- organization.schemas.ts
|   |   |       |-- organization.service.ts
|   |   |       -- organization.types.ts
|   |   |-- security/
|   |   |   |-- auth.types.ts
|   |   |   |-- authorization.ts
|   |   |   |-- internal-auth.ts
|   |   |   -- jwt.ts
|   |   |-- shared/
|   |   |   |-- errors.ts
|   |   |   -- logger.ts
|   |   |-- app.ts
|   |   -- server.ts
|   |-- tests/
|   |   |-- e2e/
|   |   |   -- organization.e2e.test.ts
|   |   |-- integration/
|   |   |   |-- api.integration.test.ts
|   |   |   |-- database.integration.test.ts
|   |   |   -- redis-idempotency.integration.test.ts
|   |   -- unit/
|   |       |-- app.test.ts
|   |       |-- config.test.ts
|   |       |-- openapi.contract.test.ts
|   |       |-- organization-api.test.ts
|   |       |-- organization.service.test.ts
|   |       |-- redis.test.ts
|   |       |-- resilience.test.ts
|   |       |-- security-api.test.ts
|   |       -- security.test.ts
|   |-- .env.example
|   |-- .gitignore
|   |-- .prettierignore
|   |-- .prettierrc
|   |-- docker-compose.yml
|   |-- Dockerfile
|   |-- eslint.config.mjs
|   |-- package-lock.json
|   |-- package.json
|   |-- README.md
|   |-- tsconfig.build.json
|   |-- tsconfig.json
|   |-- vitest.config.ts
|   |-- vitest.e2e.config.ts
|   |-- vitest.integration.config.ts
|   -- vitest.unit.config.ts
|-- resolve-authentication-service/
|   |-- .github/
|   |   -- workflows/
|   |       -- ci.yml
|   |-- docs/
|   |   -- openapi.yaml
|   |-- mocks/
|   |   |-- partial.js
|   |   -- server.js
|   |-- src/
|   |   |-- clients/
|   |   |   |-- organizationClient.js
|   |   |   |-- rbacClient.js
|   |   |   -- userTeamClient.js
|   |   |-- config/
|   |   |   -- index.js
|   |   |-- controllers/
|   |   |   -- auth.controller.js
|   |   |-- docs/
|   |   |   -- openapiSpec.js
|   |   |-- errors/
|   |   |   -- AppError.js
|   |   |-- keys/
|   |   |   |-- keyManager.js
|   |   |   -- secretsProvider.js
|   |   |-- middleware/
|   |   |   |-- authenticate.js
|   |   |   |-- errorHandler.js
|   |   |   |-- requestContext.js
|   |   |   |-- requirePermission.js
|   |   |   -- validateBody.js
|   |   |-- redis/
|   |   |   |-- client.js
|   |   |   -- keys.js
|   |   |-- routes/
|   |   |   |-- auth.routes.js
|   |   |   |-- health.routes.js
|   |   |   -- jwks.routes.js
|   |   |-- services/
|   |   |   |-- authService.js
|   |   |   |-- mfaService.js
|   |   |   |-- passwordResetService.js
|   |   |   |-- rateLimitService.js
|   |   |   |-- tokenService.js
|   |   |   |-- tokenSettingsService.js
|   |   |   -- totp.js
|   |   |-- utils/
|   |   |   -- logger.js
|   |   |-- validation/
|   |   |   -- authSchemas.js
|   |   |-- app.js
|   |   -- server.js
|   |-- tests/
|   |   |-- integration/
|   |   |   |-- hardening.test.js
|   |   |   |-- phase1.test.js
|   |   |   |-- phase2.auth.test.js
|   |   |   |-- phase3.passwordReset.test.js
|   |   |   -- phase4.tokenSettings.test.js
|   |   |-- setup/
|   |   |   |-- mockRedis.js
|   |   |   -- quietLogs.js
|   |   -- unit/
|   |       |-- keyManager.test.js
|   |       |-- mfaService.test.js
|   |       |-- phase0.smoke.test.js
|   |       |-- redisKeys.test.js
|   |       |-- secretsProvider.test.js
|   |       -- totp.test.js
|   |-- .env.example
|   |-- .gitignore
|   |-- .nvmrc
|   |-- .prettierrc
|   |-- docker-compose.yml
|   |-- Dockerfile
|   |-- eslint.config.js
|   |-- jest.config.js
|   |-- package-lock.json
|   |-- package.json
|   -- README.md
|-- resolve-rbac-service/
|   |-- .github/
|   |   -- workflows/
|   |       -- ci.yml
|   |-- docs/
|   |   -- openapi.yaml
|   |-- migrations/
|   |   |-- 1700000000000_create-rbac-tables.js
|   |   -- 1700000000001_seed-permissions-and-roles.js
|   |-- mocks/
|   |   -- server.js
|   |-- src/
|   |   |-- cache/
|   |   |   |-- client.js
|   |   |   -- permissionCache.js
|   |   |-- config/
|   |   |   -- index.js
|   |   |-- controllers/
|   |   |   |-- authz.controller.js
|   |   |   -- rbac.controller.js
|   |   |-- db/
|   |   |   -- pool.js
|   |   |-- docs/
|   |   |   -- openapiSpec.js
|   |   |-- errors/
|   |   |   -- AppError.js
|   |   |-- middleware/
|   |   |   |-- authenticate.js
|   |   |   |-- errorHandler.js
|   |   |   |-- internalAuth.js
|   |   |   |-- requestContext.js
|   |   |   |-- requirePermission.js
|   |   |   -- validateBody.js
|   |   |-- routes/
|   |   |   |-- authz.routes.js
|   |   |   |-- health.routes.js
|   |   |   -- rbac.routes.js
|   |   |-- services/
|   |   |   |-- permissionService.js
|   |   |   |-- roleService.js
|   |   |   -- userRoleService.js
|   |   |-- utils/
|   |   |   -- logger.js
|   |   |-- validation/
|   |   |   -- schemas.js
|   |   |-- app.js
|   |   -- server.js
|   |-- tests/
|   |   |-- integration/
|   |   |   |-- hardening.test.js
|   |   |   -- rbac.test.js
|   |   |-- setup/
|   |   |   |-- mockRedis.js
|   |   |   -- quietLogs.js
|   |   -- unit/
|   |       -- seedData.test.js
|   |-- .env.example
|   |-- .gitignore
|   |-- .nvmrc
|   |-- .prettierrc
|   |-- docker-compose.yml
|   |-- Dockerfile
|   |-- eslint.config.js
|   |-- jest.config.js
|   |-- package-lock.json
|   |-- package.json
|   -- README.md
|-- Resolve-User_Team_Service/
|   |-- migrations/
|   |   |-- 001_create_users_table.sql
|   |   |-- 002_create_teams_table.sql
|   |   |-- 003_create_team_members_table.sql
|   |   -- 004_add_performance_indexes.sql
|   |-- src/
|   |   |-- db/
|   |   |   |-- migrate.js
|   |   |   -- pool.js
|   |   |-- internal/
|   |   |   |-- internal.controller.js
|   |   |   |-- internal.routes.js
|   |   |   -- internal.validation.js
|   |   |-- middleware/
|   |   |   |-- authenticate.js
|   |   |   |-- authorize.js
|   |   |   |-- errorHandler.js
|   |   |   -- idempotency.js
|   |   |-- organization/
|   |   |   -- organizationClient.js
|   |   |-- security/
|   |   |   |-- jwt.js
|   |   |   -- serviceAuth.js
|   |   |-- teams/
|   |   |   |-- teams.controller.js
|   |   |   |-- teams.repository.js
|   |   |   |-- teams.routes.js
|   |   |   -- teams.validation.js
|   |   |-- users/
|   |   |   |-- users.controller.js
|   |   |   |-- users.repository.js
|   |   |   |-- users.routes.js
|   |   |   -- users.validation.js
|   |   |-- utils/
|   |   |   |-- asyncHandler.js
|   |   |   -- pagination.js
|   |   |-- app.js
|   |   -- server.js
|   |-- tests/
|   |   |-- test-auth-setup.js
|   |   |-- test-setup.js
|   |   -- user-team-service.test.js
|   |-- .env.example
|   |-- .gitattributes
|   |-- .gitignore
|   |-- docker-compose.yml
|   |-- generate-internal-token.js
|   |-- generate-token.js
|   |-- Integration Guide — User & Team Service
|   |-- openapi.yaml
|   |-- package-lock.json
|   |-- package.json
|   -- README.md
|-- resolve-web/
|   |-- .lovable/
|   |   -- project.json
|   |-- public/
|   |   -- robots.txt
|   |-- src/
|   |   |-- components/
|   |   |   |-- ui/
|   |   |   |   |-- accordion.tsx
|   |   |   |   |-- alert-dialog.tsx
|   |   |   |   |-- alert.tsx
|   |   |   |   |-- aspect-ratio.tsx
|   |   |   |   |-- avatar.tsx
|   |   |   |   |-- badge.tsx
|   |   |   |   |-- breadcrumb.tsx
|   |   |   |   |-- button.tsx
|   |   |   |   |-- calendar.tsx
|   |   |   |   |-- card.tsx
|   |   |   |   |-- carousel.tsx
|   |   |   |   |-- chart.tsx
|   |   |   |   |-- checkbox.tsx
|   |   |   |   |-- collapsible.tsx
|   |   |   |   |-- command.tsx
|   |   |   |   |-- context-menu.tsx
|   |   |   |   |-- dialog.tsx
|   |   |   |   |-- drawer.tsx
|   |   |   |   |-- dropdown-menu.tsx
|   |   |   |   |-- form.tsx
|   |   |   |   |-- hover-card.tsx
|   |   |   |   |-- input-otp.tsx
|   |   |   |   |-- input.tsx
|   |   |   |   |-- label.tsx
|   |   |   |   |-- menubar.tsx
|   |   |   |   |-- navigation-menu.tsx
|   |   |   |   |-- pagination.tsx
|   |   |   |   |-- popover.tsx
|   |   |   |   |-- progress.tsx
|   |   |   |   |-- radio-group.tsx
|   |   |   |   |-- resizable.tsx
|   |   |   |   |-- scroll-area.tsx
|   |   |   |   |-- select.tsx
|   |   |   |   |-- separator.tsx
|   |   |   |   |-- sheet.tsx
|   |   |   |   |-- sidebar.tsx
|   |   |   |   |-- skeleton.tsx
|   |   |   |   |-- slider.tsx
|   |   |   |   |-- sonner.tsx
|   |   |   |   |-- switch.tsx
|   |   |   |   |-- table.tsx
|   |   |   |   |-- tabs.tsx
|   |   |   |   |-- textarea.tsx
|   |   |   |   |-- toggle-group.tsx
|   |   |   |   |-- toggle.tsx
|   |   |   |   -- tooltip.tsx
|   |   |   |-- bits.tsx
|   |   |   -- Shell.tsx
|   |   |-- hooks/
|   |   |   -- use-mobile.tsx
|   |   |-- lib/
|   |   |   |-- error-capture.ts
|   |   |   |-- error-page.ts
|   |   |   |-- lovable-error-reporting.ts
|   |   |   |-- resolve-store.tsx
|   |   |   -- utils.ts
|   |   |-- routes/
|   |   |   |-- __root.tsx
|   |   |   |-- cases.$id.tsx
|   |   |   |-- cases.index.tsx
|   |   |   |-- index.tsx
|   |   |   |-- organization.tsx
|   |   |   |-- README.md
|   |   |   |-- workflows.$id.tsx
|   |   |   -- workflows.index.tsx
|   |   |-- router.tsx
|   |   |-- routeTree.gen.ts
|   |   |-- server.ts
|   |   |-- start.ts
|   |   -- styles.css
|   |-- .gitignore
|   |-- .prettierignore
|   |-- .prettierrc
|   |-- AGENTS.md
|   |-- bun.lock
|   |-- bunfig.toml
|   |-- components.json
|   |-- eslint.config.js
|   |-- FRONTEND_IMPLEMENTATION_GUIDE.md
|   |-- package-lock.json
|   |-- package.json
|   |-- README.md
|   |-- RESOLVE_DOCUMENTATION.md
|   |-- tsconfig.json
|   -- vite.config.ts
|-- Resolve_Document_Service/
|   |-- migrations/
|   |   |-- 001_init.sql
|   |   |-- 002_idempotency_keys.sql
|   |   |-- 003_document_versions_filename.sql
|   |   -- 004_outbox_relay_indexes.sql
|   |-- src/
|   |   |-- config/
|   |   |   -- env.js
|   |   |-- controllers/
|   |   |   -- documentsController.js
|   |   |-- db/
|   |   |   -- pool.js
|   |   |-- kafka/
|   |   |   -- producer.js
|   |   |-- middleware/
|   |   |   -- auth.js
|   |   |-- routes/
|   |   |   -- documents.js
|   |   |-- services/
|   |   |   |-- caseClient.js
|   |   |   |-- documentsService.js
|   |   |   |-- idempotencyService.js
|   |   |   |-- permissionClient.js
|   |   |   |-- s3Client.js
|   |   |   -- scanService.js
|   |   |-- workers/
|   |   |   |-- outboxRelay.js
|   |   |   -- scanRelay.js
|   |   |-- app.js
|   |   -- index.js
|   |-- .env.example
|   |-- .gitignore
|   |-- docker-compose.yml
|   |-- Integration Guide — Document Service
|   |-- openapi.yaml
|   |-- package-lock.json
|   |-- package.json
|   -- README.md
|-- Resolve_Documentation/
|   |-- Architechture_Design_Decisions/
|   |   -- .gitkeep
|   |-- Contracts/
|   |   |-- Authentication_Service.md
|   |   |-- kafka.md
|   |   |-- Organisation_Service.md
|   |   -- User_Team_Service.md
|   |-- General/
|   |   |-- Features_Phases.md
|   |   |-- Schemas_High_Level.md
|   |   |-- SRS.md
|   |   -- System_Architecture.png
|   |-- Schemas/
|   |   |-- 01_Authentication_Service_Schema.md
|   |   |-- 02_User_Team_Service_Schema.md
|   |   -- 03_Organization_Service_Schema.md
|   |-- .gitignore
|   |-- kafka.md
|   -- tasks.md
|-- scripts/
|   -- create-topics.sh
|-- .env.example
|-- .gitignore
|-- docker-compose.yml
|-- FRONTEND_DISCOVERY.md
|-- kafka_readme.MD
|-- Organization-Service.json
-- project.md
`
