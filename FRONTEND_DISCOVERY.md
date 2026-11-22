# Resolve Frontend Discovery Audit

## Executive summary

This repository is a multi-service backend ecosystem for Resolve, not a frontend application. There is no existing UI code, no route-based client app, and no React/Vue/Lovable-generated frontend in the repository snapshot. The codebase is primarily Node.js/TypeScript and JavaScript microservices with PostgreSQL/MySQL/Redis/Kafka dependencies.

The backend set currently includes:

- Organization Service
- Authentication Service
- RBAC Service
- User & Team Service
- Document Service
- Audit Service

In addition, the repository documentation references a broader platform architecture with planned services for Case Management, Workflow & Work Execution, and Notification. Those services are not present as runnable code here and should be treated as future or planned capabilities rather than implemented features.

This discovery document is structured to help a frontend generator build a realistic Resolve admin portal based strictly on what the backend actually exposes.

---

## 1. Repository-wide inventory

### Repository map

| Area | Path | Purpose | Status |
|---|---|---|---|
| Core services | [Audit_Service](./Audit_Service) | Kafka-backed audit trail, app-level log retrieval | Implemented but partially complete |
|  | [Organization-Service](./Organization-Service) | Tenant and organization lifecycle | Implemented and operational |
|  | [Resolve-User_Team_Service](./Resolve-User_Team_Service) | User and team profile management | Implemented but partially complete |
|  | [Resolve_Document_Service](./Resolve_Document_Service) | Case document upload and versioning | Implemented and operational |
|  | [resolve-authentication-service](./resolve-authentication-service) | Login, JWT issuance, MFA, password reset | Implemented and operational |
|  | [resolve-rbac-service](./resolve-rbac-service) | Roles, permissions, authorization checks | Implemented and operational |
| Platform architecture | [Resolve_Documentation](./Resolve_Documentation) | Shared Kafka contract and service assignment docs | Planning / design docs |
| Frontend | none detected | No client app found in repository | Not implemented |

### Service status by classification

| Service | Classification | Evidence |
|---|---|---|
| Organization Service | Implemented and operational | README, Prisma schema, OpenAPI, Docker Compose, CI, health endpoints |
| Authentication Service | Implemented and operational | README states Phase 2/3 complete; docs and tests confirm login, refresh, logout, reset, MFA, JWKS |
| RBAC Service | Implemented and operational | README documents verified end-to-end permission checks and cache invalidation |
| User & Team Service | Implemented but partially complete | CRUD and team membership endpoints exist; synchronous REST only; no Kafka events |
| Document Service | Implemented and operational | README calls it standalone complete; upload, versioning, Kafka outbox all documented |
| Audit Service | Implemented but partially complete | Owns DB and Kafka consumption; retrieval endpoint exists but default auth adapter denies reads |
| Case Management Service | Documentation only / planned | Referenced in task docs and Kafka documentation; code absent |
| Workflow Service | Documentation only / planned | Referenced in task docs and Kafka map; code absent |
| Notification Service | Documentation only / planned | Referenced in task docs; code absent |

---

## 2. Service-by-service architecture

### 2.1 Organization Service

- Path: [Organization-Service](./Organization-Service)
- Purpose: organization / tenant provisioning and lifecycle control
- Stack: Node.js 20 + TypeScript + Express + MySQL 8 + Prisma + Redis + Zod + Vitest + Docker
- Database: MySQL, table `organizations`
- Port: `http://localhost:3000`
- Auth: bearer JWT for public APIs; internal service auth for internal endpoints
- Key responsibilities:
  - tenant creation and lifecycle (`ACTIVE` / `SUSPENDED`)
  - uniqueness and slug validation
  - internal lookup by `id` and `slug`
  - idempotent creation with Redis
- Public endpoints:
  - `POST /api/v1/organizations`
  - `GET /api/v1/organizations`
  - `GET /api/v1/organizations/{id}`
  - `PATCH /api/v1/organizations/{id}`
  - `PATCH /api/v1/organizations/{id}/status`
- Internal endpoints:
  - `GET /internal/v1/organizations/{id}`
  - `GET /internal/v1/organizations/by-slug/{slug}`
- Database model: `Organization` with `id`, `name`, `slug`, `status`, timestamps
- Notable dependency: requires `JWT_SECRET`, `INTERNAL_AUTH_SECRET`, `SYSTEM_ADMIN_USER_IDS`, Redis and MySQL

### 2.2 Authentication Service

- Path: [resolve-authentication-service](./resolve-authentication-service)
- Purpose: authentication, session management, token issuance, MFA, password resets
- Stack: Node.js 20 + JavaScript + Express + Redis + jose/RS256 + Jest + Supertest
- Database: none of its own; persisted state is Redis and JWKS files/secrets provider
- Port: `http://localhost:4001`
- Auth model:
  - login via email + password
  - JWT access tokens and refresh tokens
  - token rotation on refresh
  - access token revocation on logout
  - public JWKS at `/.well-known/jwks.json`
- Public endpoints:
  - `GET /health`, `GET /health/ready`
  - `GET /.well-known/jwks.json`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `POST /api/v1/auth/password-reset/request`
  - `POST /api/v1/auth/password-reset/confirm`
  - `GET /api/v1/auth/mfa/status`
  - `POST /api/v1/auth/mfa/enroll`
  - `POST /api/v1/auth/mfa/enroll/confirm`
  - `POST /api/v1/auth/mfa/verify`
  - `POST /api/v1/auth/mfa/disable`
  - `GET /api/v1/auth/token-settings`
  - `PATCH /api/v1/auth/token-settings`
- Important note: the service is purposely designed to use mock dependency services by default (`USE_MOCKS=true`), then switch to real User & Team / Organization / RBAC services when available.

### 2.3 RBAC Service

- Path: [resolve-rbac-service](./resolve-rbac-service)
- Purpose: permission catalog, roles, assignments, authorization checks
- Stack: Node.js 20 + JavaScript + Express + PostgreSQL + Redis + JWT verification via JWKS + node-pg-migrate
- Database: PostgreSQL; tables `permissions`, `roles`, `role_permissions`, `user_roles`
- Port: `http://localhost:4300`
- Auth model:
  - public bearer-token access to role and permission management endpoints
  - internal token auth for `/internal/v1/authz/check` and `/internal/v1/authz/check-bulk`
- Core features:
  - role creation, update, deletion
  - user-role assignment and revocation
  - flattened permission lookup for users
  - internal hot-path permission validation
- System roles seeded: `ORG_ADMIN`, `CASE_MANAGER`
- Permission examples: `CASE_CREATE`, `CASE_READ`, `DOCUMENT_UPLOAD`, `ROLE_MANAGE`, `AUDIT_READ`, `AUTH_SETTINGS_MANAGE`

### 2.4 User & Team Service

- Path: [Resolve-User_Team_Service](./Resolve-User_Team_Service)
- Purpose: manages user profile records, team definitions, and memberships within an organization
- Stack: Node.js 20 + Express + PostgreSQL + Joi/Zod + bcryptjs + jose + Swagger
- Database: PostgreSQL with `users`, `teams`, `team_members`
- Port: `http://localhost:8080` from `src/server.js`
- Auth model:
  - public routes under `/api/v1` require bearer JWT
  - tenant scope comes only from `tenantId` claim, not from client-supplied organization values
  - cross-tenant resources return `404`
  - creating POSTs require `Idempotency-Key`
- Main endpoints:
  - `POST /api/v1/users`
  - `GET /api/v1/users`
  - `GET /api/v1/users/{id}`
  - `PATCH /api/v1/users/{id}`
  - `POST /api/v1/teams`
  - `GET /api/v1/teams`
  - `GET /api/v1/teams/{id}`
  - `PATCH /api/v1/teams/{id}`
  - `DELETE /api/v1/teams/{id}`
  - `POST /api/v1/teams/{id}/members`
  - `GET /api/v1/teams/{id}/members`
  - `DELETE /api/v1/teams/{id}/members/{userId}`
- Internal routes:
  - `GET /internal/v1/users/lookup`
  - `GET /internal/v1/users/{id}`
  - `POST /internal/v1/users/{id}/verify-credentials`
  - `PATCH /internal/v1/users/{id}/password-hash`
- Dependency: verifies organization via internal Organization Service call before user/team creation.

### 2.5 Document Service

- Path: [Resolve_Document_Service](./Resolve_Document_Service)
- Purpose: case document storage, metadata tracking, versioning, and Kafka event publication
- Stack: Node.js + Express + PostgreSQL + S3-compatible storage + Kafka + Docker
- Database: PostgreSQL with `documents`, `document_versions`, `outbox_events`
- Port: `http://localhost:3000`
- Auth: bearer JWT required by default
- Key features:
  - file upload to case
  - metadata + version history
  - signed download URLs
  - blocked MIME list and upload size limits
  - transactional outbox to Kafka
- Public endpoints:
  - `POST /api/v1/cases/{caseId}/documents`
  - `GET /api/v1/cases/{caseId}/documents`
  - `GET /api/v1/cases/{caseId}/documents/{documentId}`
  - `GET /api/v1/cases/{caseId}/documents/{documentId}/download`
  - `POST /api/v1/cases/{caseId}/documents/{documentId}/versions`
  - `GET /api/v1/cases/{caseId}/documents/{documentId}/versions`
  - `GET /api/v1/cases/{caseId}/documents/{documentId}/versions/{versionNumber}/download`
- Kafka output: `resolve.document.uploaded` via outbox relay

### 2.6 Audit Service

- Path: [Audit_Service](./Audit_Service)
- Purpose: ingest Kafka domain events and provide append-only audit history
- Stack: Node.js + TypeScript + Express + Prisma + PostgreSQL + KafkaJS + Redis + Zod
- Database: PostgreSQL with `audit_logs` and `audit_event_processing`
- Port: `http://localhost:3000`
- Current status: retrieval endpoint exists but is intentionally restricted by default because the runtime RBAC adapter is failing closed.
- Published/consumed event topics:
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
- Retrieval endpoint:
  - `GET /api/v1/audit`
- Constraints: per README it requires valid JWT and tenant scoping; all reads are blocked until an audit-view RBAC permission adapter is approved.

---

## 3. Complete API endpoint inventory

The repository exposes a usable set of backend endpoints. The following are the frontend-relevant ones that are currently implemented or documented as live.

### 3.1 Organization Service

| Method | Endpoint | Auth | Purpose | Status |
|---|---|---|---|---|
| GET | `/health` | none | liveness | implemented |
| GET | `/health/ready` | none | readiness | implemented |
| POST | `/api/v1/organizations` | bearer JWT | create organization | implemented |
| GET | `/api/v1/organizations` | bearer JWT | list organizations | implemented |
| GET | `/api/v1/organizations/{id}` | bearer JWT | get organization details | implemented |
| PATCH | `/api/v1/organizations/{id}` | bearer JWT | update profile | implemented |
| PATCH | `/api/v1/organizations/{id}/status` | bearer JWT | toggle `ACTIVE` / `SUSPENDED` | implemented |
| GET | `/internal/v1/organizations/{id}` | internal service auth | tenant lookup by ID | implemented |
| GET | `/internal/v1/organizations/by-slug/{slug}` | internal service auth | tenant lookup by slug | implemented |

### 3.2 Authentication Service

| Method | Endpoint | Auth | Purpose | Status |
|---|---|---|---|---|
| GET | `/health` | none | liveness | implemented |
| GET | `/health/ready` | none | readiness | implemented |
| GET | `/.well-known/jwks.json` | none | public JWT verification keys | implemented |
| POST | `/api/v1/auth/login` | none | email/password login | implemented |
| POST | `/api/v1/auth/refresh` | none | refresh access/refresh pair | implemented |
| POST | `/api/v1/auth/logout` | bearer JWT | revoke access token and optional refresh token | implemented |
| POST | `/api/v1/auth/password-reset/request` | none | request reset | implemented |
| POST | `/api/v1/auth/password-reset/confirm` | none | complete reset | implemented |
| GET | `/api/v1/auth/mfa/status` | bearer JWT | MFA status | implemented |
| POST | `/api/v1/auth/mfa/enroll` | bearer JWT | begin MFA enrollment | implemented |
| POST | `/api/v1/auth/mfa/enroll/confirm` | bearer JWT | confirm MFA enrollment | implemented |
| POST | `/api/v1/auth/mfa/verify` | bearer JWT | verify challenge | implemented |
| POST | `/api/v1/auth/mfa/disable` | bearer JWT | disable MFA | implemented |
| GET | `/api/v1/auth/token-settings` | bearer JWT + RBAC | current TTL config | implemented |
| PATCH | `/api/v1/auth/token-settings` | bearer JWT + RBAC | update TTL config | implemented |

### 3.3 RBAC Service

| Method | Endpoint | Auth | Purpose | Status |
|---|---|---|---|---|
| GET | `/health` | none | liveness | implemented |
| GET | `/health/ready` | none | readiness | implemented |
| GET | `/api/v1/rbac/permissions` | bearer JWT | full permission catalog | implemented |
| GET | `/api/v1/rbac/roles` | bearer JWT | list roles | implemented |
| POST | `/api/v1/rbac/roles` | bearer JWT | create custom role | implemented |
| GET | `/api/v1/rbac/roles/{id}` | bearer JWT | fetch role by id | implemented |
| PATCH | `/api/v1/rbac/roles/{id}` | bearer JWT | update role | implemented |
| DELETE | `/api/v1/rbac/roles/{id}` | bearer JWT | delete role | implemented |
| GET | `/api/v1/rbac/users/{userId}/roles` | bearer JWT | list user roles | implemented |
| POST | `/api/v1/rbac/users/{userId}/roles` | bearer JWT | assign role | implemented |
| DELETE | `/api/v1/rbac/users/{userId}/roles/{roleId}` | bearer JWT | revoke role | implemented |
| GET | `/api/v1/rbac/users/{userId}/permissions` | bearer JWT | flattened permissions | implemented |
| POST | `/internal/v1/authz/check` | internal service token | allow/deny check | implemented |
| POST | `/internal/v1/authz/check-bulk` | internal service token | batch permission check | implemented |

### 3.4 User & Team Service

| Method | Endpoint | Auth | Purpose | Status |
|---|---|---|---|---|
| GET | `/health` | none | health | implemented |
| POST | `/api/v1/users` | bearer JWT | create user | implemented |
| GET | `/api/v1/users` | bearer JWT | list users | implemented |
| GET | `/api/v1/users/{id}` | bearer JWT | user details | implemented |
| PATCH | `/api/v1/users/{id}` | bearer JWT | update user | implemented |
| POST | `/api/v1/teams` | bearer JWT | create team | implemented |
| GET | `/api/v1/teams` | bearer JWT | list teams | implemented |
| GET | `/api/v1/teams/{id}` | bearer JWT | team details | implemented |
| PATCH | `/api/v1/teams/{id}` | bearer JWT | update team | implemented |
| DELETE | `/api/v1/teams/{id}` | bearer JWT | delete team | implemented |
| POST | `/api/v1/teams/{id}/members` | bearer JWT | add member | implemented |
| GET | `/api/v1/teams/{id}/members` | bearer JWT | list members | implemented |
| DELETE | `/api/v1/teams/{id}/members/{userId}` | bearer JWT | remove member | implemented |
| GET | `/internal/v1/users/lookup` | internal auth | user lookup | implemented |
| GET | `/internal/v1/users/{id}` | internal auth | internal user lookup | implemented |
| POST | `/internal/v1/users/{id}/verify-credentials` | internal auth | credential verification | implemented |
| PATCH | `/internal/v1/users/{id}/password-hash` | internal auth | password hash mapping | implemented |

### 3.5 Document Service

| Method | Endpoint | Auth | Purpose | Status |
|---|---|---|---|---|
| GET | `/health` | none | liveness | implemented |
| POST | `/api/v1/cases/{caseId}/documents` | bearer JWT | upload document | implemented |
| GET | `/api/v1/cases/{caseId}/documents` | bearer JWT | list documents | implemented |
| GET | `/api/v1/cases/{caseId}/documents/{documentId}` | bearer JWT | get document metadata | implemented |
| GET | `/api/v1/cases/{caseId}/documents/{documentId}/download` | bearer JWT | redirect to signed file URL | implemented |
| POST | `/api/v1/cases/{caseId}/documents/{documentId}/versions` | bearer JWT | upload new version | implemented |
| GET | `/api/v1/cases/{caseId}/documents/{documentId}/versions` | bearer JWT | list version history | implemented |
| GET | `/api/v1/cases/{caseId}/documents/{documentId}/versions/{versionNumber}/download` | bearer JWT | download a specific version | implemented |

### 3.6 Audit Service

| Method | Endpoint | Auth | Purpose | Status |
|---|---|---|---|---|
| GET | `/health` | none | liveness | implemented |
| GET | `/health/ready` | none | readiness | implemented |
| GET | `/api/v1/audit` | bearer JWT | retrieve tenant-scoped audit records | implemented but access denied by default |

### 3.7 Planned or documented-only endpoints not implemented in this repository

The following service domains are described in project docs but do not appear as running code in this repo:

- Case Management: `POST/GET/PATCH /api/v1/cases`, assignment, transitions, comments, search
- Workflow & Work Execution: task and approval lifecycle endpoints
- Notification Service: send alerts, release messages, email/notification actions

These should be treated as future modules, not guaranteed frontend targets.

---

## 4. Authentication, authorization, and security analysis

### 4.1 How users authenticate

The real authentication flow is centered on the Authentication Service:

1. Client calls `POST /api/v1/auth/login` with email, password, and organization context.
2. Authentication Service validates credentials against the User & Team Service and resolves tenant context via Organization Service.
3. A signed JWT pair is returned to the client: access token + refresh token.
4. Public JWT verification uses the public JWKS at `/.well-known/jwks.json`.

This is the current front-end identity contract that should be implemented in the UI.

### 4.2 How tokens are handled by downstream services

Other services validate JWTs locally or by JWKS, not by calling back to Authentication Service on every request. In the architecture described by the repo:

- Organization Service validates bearer JWTs for public API access.
- User & Team Service requires bearer JWTs and enforces tenant scope through `tenantId` claims.
- Document Service expects bearer-tokens for document APIs.
- Audit Service expects valid JWTs and tenant-scoped claims; reads are closed by default until RBAC contract is approved.
- RBAC Service verifies incoming JWTs and is the central policy evaluation service.

### 4.3 Internal service authentication

The repo has multiple internal trust layers:

- Organization Service: internal JWT or HMAC service auth, with `INTERNAL_AUTH_SECRET` and `INTERNAL_ALLOWED_SERVICES`
- User & Team Service: internal `/internal/v1` APIs require a verified mTLS client cert or signed internal JWT with a `service` claim
- RBAC Service: internal auth uses `X-Internal-Service-Token`

The key principle is that end-user bearer tokens are not forwarded as service identities.

### 4.4 RBAC and permission evaluation

The central model is:

- User belongs to an organization
- User holds zero or more roles in that organization
- Roles map to permissions
- Service checks use the RBAC internal API or a local permission evaluation layer

Permission examples include:

- `USER_MANAGE`, `USER_READ`
- `TEAM_MANAGE`, `TEAM_READ`
- `ROLE_MANAGE`
- `AUDIT_READ`
- `DOCUMENT_UPLOAD`, `DOCUMENT_READ`
- `CASE_APPROVE`, `CASE_ASSIGN`

There is no evidence of a generic fine-grained ABAC or resource-level permission system beyond the current set of role-based checks.

### 4.5 Token expiry and refresh behavior

The backend supports:

- access-token issuance and refresh-token rotation
- refresh flow `POST /api/v1/auth/refresh`
- logout and revocation of access tokens from Redis
- password reset invalidation of active sessions

The frontend should handle:

- refresh token rotation
- 401 responses on expired access token
- silent token refresh before retrying a protected request when possible
- secure storage pattern (prefer httpOnly secure cookies if the app is browser-based, or secure server-side session storage if architecture requires it)

### 4.6 Missing or incomplete security functionality

The repository identifies several real gaps:

- Audit Service audit-read RBAC adapter is still failing closed
- MFA is implemented but is still an opt-in user capability, not yet a full platform-wide policy engine
- Notification delivery for password reset is not implemented because the service has no synchronous email path
- No unified SSO or external identity provider integration is present
- No frontend or browser auth UX is present in code

---

## 5. Database and business entity understanding

### 5.1 Entity model summary by service

| Service | Ownership | Core tables / models |
|---|---|---|
| Organization Service | tenant / organization domain | `organizations` |
| User & Team Service | human identity and team membership | `users`, `teams`, `team_members` |
| RBAC Service | permissions and authorization | `permissions`, `roles`, `role_permissions`, `user_roles` |
| Audit Service | immutable business event logs | `audit_logs`, `audit_event_processing` |
| Document Service | document metadata and upload events | `documents`, `document_versions`, `outbox_events` |

### 5.2 Key entity fields and relationships

#### Organization

`Organization` has:

- `id`
- `name`
- `slug`
- `status` (`ACTIVE`, `SUSPENDED`)
- `createdAt`, `updatedAt`

The slug is globally unique at the organization level; each other service treats this as the primary tenant boundary.

#### User

`users` includes:

- `id`
- `organization_id`
- `email`
- `username`
- `password_hash` (owned/managed by Auth service but colocated in the users table in the User & Team schema)
- `full_name`
- `status` (`ACTIVE`, `INACTIVE`, `SUSPENDED`)
- `created_at`, `updated_at`

Unique constraints: `(organization_id, email)` and `(organization_id, username)`.

#### Team

`teams` includes:

- `id`
- `organization_id`
- `name`
- `created_at`, `updated_at`

Unique constraint: `(organization_id, name)`.

#### Team membership

`team_members`:

- `team_id`
- `user_id`
- `joined_at`

Primary key: `(team_id, user_id)`.

#### RBAC

`roles`:

- `id`
- `organization_id` (nullable for global system roles)
- `name`
- `description`
- `is_system_role`

`permissions`:

- `id`
- `code`
- `description`

`role_permissions`: many-to-many mapping

`user_roles`: many-to-many user to role by `user_id`, `organization_id`, `role_id`

#### Audit

`audit_logs` captures immutable event entries:

- `eventId`
- `tenantId`
- `actorId`
- `action`
- `eventVersion`
- `resourceType`
- `resourceId`
- `timestamp`
- `payload`
- `requestId`, `traceId`

#### Document

`documents` records metadata and upload state:

- `id`
- `organization_id`
- `case_id`
- `comment_id`
- `uploaded_by`
- `filename`
- `mime_type`
- `size_bytes`
- `checksum`
- `storage_key`
- `scan_status` (`PENDING`, `CLEAN`, `INFECTED`, `FAILED`)
- `current_version`

`document_versions` captures historical versions; `outbox_events` ensures eventual Kafka publication.

### 5.3 Relationship model and frontend grouping

The services do not share direct database connections; they are intentionally isolated per-service. The common cross-service key is organization/tenant identity, and many UI groupings should be assembled by calling multiple services in sequence.

Examples:

- User profile page: `User & Team` + `RBAC` + `Organization` if a tenant/admin context is needed
- Team management: `User & Team` + `RBAC` permission checks
- Audit dashboard: `Audit Service` + `RBAC` + optional `Organization` metadata
- Document library: `Document Service` + `User & Team` for uploader info

The frontend should never assume a single database or a shared entity graph across services.

---

## 6. Inter-service communication and event architecture

### 6.1 Synchronous HTTP communication

The repo is built on synchronous REST calls in the core path:

- Authentication Service calls User & Team / Organization / RBAC services for validation and resolution
- User & Team Service validates the organization with Organization Service before creating users/teams
- Other services rely on JWT validation and internal service auth tokens rather than centralized session state
- RBAC is the internal hot-path permission broker called by other services

### 6.2 Kafka event architecture

The shared event contract is documented in [Resolve_Documentation/kafka.md](./Resolve_Documentation/kafka.md). The actual event topics described are:

- `resolve.case.created`
- `resolve.case.assigned`
- `resolve.case.statuschanged`
- `resolve.case.resolved`
- `resolve.task.created`
- `resolve.task.completed`
- `resolve.document.uploaded`
- `resolve.approval.requested`
- `resolve.approval.completed`

Producer → consumer pattern:

- Case Management produces case lifecycle events
- Workflow produces task and approval events
- Document Service produces `resolve.document.uploaded`
- Audit Service consumes all documented topics
- Notification Service is expected to consume certain event streams

### 6.3 Event envelope pattern

The repo documents a standard event envelope with keys such as:

- `eventId`
- `eventType`
- `eventVersion`
- `tenantId`
- `actorId`
- `resourceType`
- `resourceId`
- `timestamp`
- `metadata`

Audit Service stores these payloads in an append-only database and exposes the retrieval layer via `/api/v1/audit`.

### 6.4 Outbox pattern

Document Service is the clearest implemented example of an event-driven architecture in code. It uses a transactional outbox table (`outbox_events`) to guarantee that:

- the document row and outbox row are committed together
- Kafka publication happens asynchronously via a relay worker
- the UI can show an immediate success state even when full event propagation is still in flight

### 6.5 Frontend-visible async workflows

The most frontend-visible async behavior currently supported by code is:

- document upload success followed by eventual `resolve.document.uploaded` publication
- audit log eventual consistency after Kafka consumption
- refresh or token-state changes depending on auth service behavior

No real-time UI update mechanism or websocket layer is described.

---

## 7. Frontend product requirements and module mapping

Because there is no existing frontend, the module list below should be treated as a realistic, backend-supported architecture for a Resolve admin portal.

### 7.1 Supported modules

| Module | Purpose | Backend support | Status |
|---|---|---|---|
| Authentication and onboarding | login, refresh, logout, password reset, MFA | Auth Service | Supported |
| Organization management | create/list/update/suspend tenants | Organization Service | Supported |
| User administration | create/manage users in an org | User & Team Service, RBAC Service | Supported |
| Team management | create team, add/remove members | User & Team Service | Supported |
| Role and permission management | role CRUD, assignment, permission review | RBAC Service | Supported |
| Audit log and compliance | read audit event records | Audit Service | Partially supported due auth adapter restrictions |
| Document management | upload, list, download, version history | Document Service | Supported |
| Profile and settings | account profile + token settings | Auth Service + User & Team Service | Supported |
| System health / service checks | health and readiness endpoints | endpoint-only services | Supported |

### 7.2 Recommended pages and UX structure

#### Authentication

- `/login`
- `/forgot-password`
- `/reset-password`
- `/mfa/setup`
- `/profile/security`

Required APIs:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- password reset endpoints
- MFA endpoints

User actions:

- sign in
- sign out
- request reset
- verify MFA
- configure TOTP

#### Tenant / organization management

- `/organizations`
- `/organizations/new`
- `/organizations/:id`
- `/organizations/:id/settings`

Required APIs:

- `POST /api/v1/organizations`
- `GET /api/v1/organizations`
- `GET /api/v1/organizations/{id}`
- `PATCH /api/v1/organizations/{id}`
- `PATCH /api/v1/organizations/{id}/status`

#### User and team management

- `/users`
- `/users/:id`
- `/teams`
- `/teams/:id`
- `/teams/:id/members`

Required APIs:

- user CRUD endpoints from User & Team Service
- team CRUD endpoints
- membership endpoints

#### Roles and permissions management

- `/rbac/roles`
- `/rbac/roles/new`
- `/rbac/users/:id/roles`
- `/rbac/permissions`

Required APIs:

- `GET /api/v1/rbac/roles`
- `POST /api/v1/rbac/roles`
- `PATCH /api/v1/rbac/roles/{id}`
- `GET /api/v1/rbac/users/{userId}/permissions`
- `POST /api/v1/rbac/users/{userId}/roles`

#### Audit console

- `/audit`
- `/audit/:resourceType/:resourceId`

Required APIs:

- `GET /api/v1/audit`

Important note: the backend currently fails closed until the Audit-view permission contract is approved, so the UI should account for access denial states and not assume audit data is immediately visible.

#### Document library

- `/cases/:id/documents`
- `/cases/:id/documents/upload`
- `/cases/:id/documents/:documentId`
- `/cases/:id/documents/:documentId/version-history`

Required APIs:

- Document Service upload/list/download/version endpoints

#### System health and config

- `/health`
- `/settings/auth-token-policy`

Required APIs:

- health endpoints from individual services
- `GET/PATCH /api/v1/auth/token-settings`

### 7.3 Modules that are not currently backend-supported

These should be treated as proposed future functionality only:

- Case management
- Task management
- Workflow approval automation
- Notification center
- Business dashboards that aggregate case/task metrics
- AI-assisted document review / scanning workflows beyond upload and scan status metadata

These service domains are referenced in design docs but are not implemented in this repository snapshot.

---

## 8. High-confidence conclusions for frontend generation

1. The repository is a backend platform with six implemented service domains, not a complete product app.
2. There is no existing frontend. The UI must be built from scratch around the available APIs.
3. The most realistic first-pass frontend should cover:
   - auth
   - orgs
   - users/teams
   - RBAC
   - document library
   - audit console
4. The frontend should not assume the existence of case management, workflow, or notification modules until those services are added.
5. Identity and security are centralized around the Authentication Service and RBAC Service; the frontend must respect JWT expiry, refresh rotation, and RBAC permission boundaries.
6. The repository intentionally isolates data by service and by tenant. The UI must aggregate multiple API calls instead of expecting a single shared database.

---

## 9. Recommended implementation priority for a generated frontend

For a first frontend build phase, the safest order is:

1. Authentication and session management
2. Organization management
3. User and team management
4. RBAC role management
5. Document library
6. Audit console / system health

This order aligns with the current backend implementation maturity and minimizes the risk of building screens against features that do not yet exist.

---

## 10. Final note

The repository is a credible foundation for a Resolve enterprise platform, but it is not a finished product. It is best understood as a set of domain services with a strict service boundary model and a strong JWT/RBAC security model. For a frontend generator, the best strategy is to build the app around the implemented service inventory and keep planned case/workflow/notification features explicitly marked as future work rather than assumed functionality.
