# Resolve Frontend Implementation Guide

> Scope: repository-grounded implementation guide for building on top of the existing `resolve-web` TanStack Start application.
>
> This is a discovery and implementation specification only. It does not implement frontend changes or modify backend services.

## 1. Purpose and recommended product direction

`resolve-web` is currently a polished local prototype for a **case and workflow operations console**. It uses React 19, TanStack Start, TanStack Router, TanStack Query, Tailwind CSS, Radix UI primitives, and browser `localStorage` as its complete data source.

The surrounding Resolve repository is a set of independently deployed microservices. The target frontend should preserve the existing visual language and route structure while replacing prototype-only behavior with real service-backed data and adding currently missing authentication and organization/RBAC administration screens.

The strongest implementation sequence is:

1. Replace local-only state with API-backed authentication and session handling.
2. Add organization, user, team, role, and permission management.
3. Connect the existing organization and case UI concepts to real APIs where available.
4. Add document upload/list/download/version UI for real case documents.
5. Add the audit console.
6. Add service health and future notification/case/workflow modules only when their backend services exist.

Do not present workflow, case, comment, approval, or notification CRUD as backend-supported until the corresponding services are implemented. The current frontend contains these features only as local prototypes.

---

## 2. Existing `resolve-web` structure

| Path | Responsibility | Implementation note |
|---|---|---|
| [package.json](./package.json) | dependencies and scripts | React 19, TanStack Start/Router/Query, Tailwind 4, Radix UI, Zod, Recharts, React Hook Form |
| [vite.config.ts](./vite.config.ts) | Lovable/TanStack/Vite configuration | Do not add duplicate TanStack or Tailwind plugins |
| [src/routes/__root.tsx](./src/routes/__root.tsx) | root HTML layout, provider composition, error UI | Preserve `<Outlet />` and `ResolveProvider` |
| [src/routes/index.tsx](./src/routes/index.tsx) | `/` dashboard | local prototype metrics, status and priority breakdowns, recent activity |
| [src/routes/cases.index.tsx](./src/routes/cases.index.tsx) | `/cases` | local case list, search, status/priority/workflow filters, create/edit/delete |
| [src/routes/cases.$id.tsx](./src/routes/cases.$id.tsx) | `/cases/:id` | local case detail, stage progress, comments, audit, documents, approvals |
| [src/routes/workflows.index.tsx](./src/routes/workflows.index.tsx) | `/workflows` | local workflow list and create/edit/delete |
| [src/routes/workflows.$id.tsx](./src/routes/workflows.$id.tsx) | `/workflows/:id` | local stage and nested task/gate builder |
| [src/routes/organization.tsx](./src/routes/organization.tsx) | `/organization` | local seed-based users and teams view |
| [src/components/Shell.tsx](./src/components/Shell.tsx) | app shell | sidebar, header, breadcrumbs, notification menu |
| [src/components/bits.tsx](./src/components/bits.tsx) | reusable basic controls | buttons, tags, modal, field, input, textarea, select |
| [src/components/ui](./src/components/ui) | Radix UI component library | accordion, dialog, drawer, table, tabs, tooltip, chart, and related primitives |
| [src/lib/resolve-store.tsx](./src/lib/resolve-store.tsx) | prototype data store | all current application data and mutations live in browser `localStorage` |
| [src/lib/utils.ts](./src/lib/utils.ts) | shared utilities | class-name merging/utility helpers |
| [src/lib/error-capture.ts](./src/lib/error-capture.ts) | Lovable error capture | browser-side error diagnostics |
| [src/lib/error-page.ts](./src/lib/error-page.ts) | rendered error fallback | recoverable and catastrophic error screen |
| [src/lib/lovable-error-reporting.ts](./src/lib/lovable-error-reporting.ts) | error reporting integration | Lovable-specific reporting |
| [src/router.tsx](./src/router.tsx) | TanStack router construction | creates `QueryClient` and router context |
| [src/routeTree.gen.ts](./src/routeTree.gen.ts) | generated route tree | generated; do not edit manually |
| [src/styles.css](./src/styles.css) | design tokens and global styles | light frosted-console visual system; rise/slide/flow utilities |
| [src/server.ts](./src/server.ts) | SSR server entry | custom error normalization |
| [src/start.ts](./src/start.ts) | TanStack Start middleware | error middleware and CSRF middleware |
| [RESOLVE_DOCUMENTATION.md](./RESOLVE_DOCUMENTATION.md) | current prototype product description | describes local workflow/case behavior; must not be treated as backend documentation |
| [AGENTS.md](./AGENTS.md) | local coding conventions | TanStack file routing conventions |

### Existing UI language

The app should preserve:

- soft blue-gray canvas
- glass/frosted surfaces
- subtle animated background glows
- a fixed left sidebar
- compact breadcrumb header
- uppercase mono section labels
- blue primary actions
- success/warn/danger semantic colors
- `rise` entrance animations
- rounded cards and restrained borders
- Tailwind utility styling

The current design tokens are in [src/styles.css](./src/styles.css):

- radius: `0.75rem`
- fonts: Inter and JetBrains Mono
- primary: blue
- success: green
- warn: orange
- danger: red

---

## 3. Current prototype behavior to preserve or migrate

### 3.1 Dashboard

Existing dashboard features:

- total cases
- open/in-review/blocked/resolved counts
- active workflow count
- pending approval count
- status breakdown
- priority breakdown
- recent activity
- recent cases

Backend reality: no case-management service is present in this repository, and no dashboard/statistics endpoint is implemented. The existing dashboard must therefore remain prototype/demo content unless Case Management APIs are added.

### 3.2 Workflows

Existing UI supports:

- workflow list
- create and rename
- active/draft/archived status
- workflow detail
- ordered stages
- stage name/description
- task and approval-gate nodes
- nested task hierarchy
- stage movement and node CRUD
- delete with cascading warning

Backend reality: no Workflow/Work Execution service code is present. These forms and mutations must not be wired to invented endpoints.

### 3.3 Cases

Existing UI supports:

- case list and search
- status and priority filters
- workflow filter
- create/edit/delete
- owner and summary fields
- stage conveyor
- previous/next stage
- task and approval checklist
- comments
- audit timeline
- document table/upload modal
- approval decisions

Backend reality:

- no Case Management service exists in this repository
- no comment service endpoints exist
- no case/task/approval REST endpoints exist
- the existing prototype’s approvals and notification data are local-only

The UI can be retained as a polished future-ready shell, but API integration is blocked until those services implement frozen contracts.

### 3.4 Organization

The existing organization route currently displays:

- role distribution cards
- a read-only users table
- team cards
- local seed data

This page should migrate to real APIs:

- organization record APIs
- User & Team APIs
- RBAC role APIs
- RBAC user-role APIs

### 3.5 Notifications

The existing shell displays a notification dropdown backed by prototype state.

Backend reality: Notification Service is only documented/planned. Do not implement this as a real module until a notification API or event subscription contract exists.

---

## 4. Repository-wide backend inventory

### 4.1 Organization Service

- Implementation: [../Organization-Service](../Organization-Service)
- Stack: Node.js 20, TypeScript, Express, MySQL/Prisma, Redis
- Local public base URL: `http://localhost:3000`
- Public operations:
  - `POST /api/v1/organizations`
  - `GET /api/v1/organizations`
  - `GET /api/v1/organizations/{id}`
  - `PATCH /api/v1/organizations/{id}`
  - `PATCH /api/v1/organizations/{id}/status`
- Health: `/health`, `/health/ready`
- Internal only:
  - `GET /internal/v1/organizations/{id}`
  - `GET /internal/v1/organizations/by-slug/{slug}`
- Create requires `Idempotency-Key`.
- Public list supports `page`, `size`, `name`, `slug`, `status`, and canonical `sort=field,direction` sorting.
- Status values: `ACTIVE`, `SUSPENDED`.
- Public create/status operations require a System Administrator authorization rule in the existing temporary or RBAC-backed implementation.

### 4.2 Authentication Service

- Implementation: [../resolve-authentication-service](../resolve-authentication-service)
- Stack: Node.js 20, JavaScript/CommonJS, Express, Redis, jose/RS256
- Local base URL: `http://localhost:4001`
- Public operations:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `POST /api/v1/auth/password-reset/request`
  - `POST /api/v1/auth/password-reset/confirm`
  - `GET /.well-known/jwks.json`
  - `GET /api/v1/auth/mfa/status`
  - `POST /api/v1/auth/mfa/enroll`
  - `POST /api/v1/auth/mfa/enroll/confirm`
  - `POST /api/v1/auth/mfa/verify`
  - `POST /api/v1/auth/mfa/disable`
  - `GET/PATCH /api/v1/auth/token-settings`
- Login must include tenant context according to the implemented contract, commonly organization slug plus email/password.
- Login returns access and refresh token data, or `202` for an MFA challenge.
- Refresh exchanges a refresh token for a rotated pair.
- Logout revokes the access token and can optionally revoke its paired refresh token.
- Password-reset delivery is not actually implemented: no synchronous email/notification endpoint exists.
- There is no frontend auth route or auth provider in the current app.

### 4.3 RBAC Service

- Implementation: [../resolve-rbac-service](../resolve-rbac-service)
- Stack: Node.js 20, JavaScript, Express, PostgreSQL, Redis cache
- Local base URL: `http://localhost:4300`
- Public operations:
  - `GET /api/v1/rbac/permissions`
  - `GET /api/v1/rbac/roles`
  - `POST /api/v1/rbac/roles`
  - `GET/PATCH/DELETE /api/v1/rbac/roles/{id}`
  - `GET/POST /api/v1/rbac/users/{userId}/roles`
  - `DELETE /api/v1/rbac/users/{userId}/roles/{roleId}`
  - `GET /api/v1/rbac/users/{userId}/permissions`
- Internal operations:
  - `POST /internal/v1/authz/check`
  - `POST /internal/v1/authz/check-bulk`
- Seeded system roles: `ORG_ADMIN` and `CASE_MANAGER`.
- Seeded permission areas include organizations, users, teams, roles, cases, tasks, documents, approvals, audit, and authentication settings.
- Custom roles are tenant-scoped.
- System roles cannot be updated or deleted.
- Permission code names are service-level strings, not frontend display labels.

### 4.4 User & Team Service

- Implementation: [../Resolve-User_Team_Service](../Resolve-User_Team_Service)
- Stack: Node.js 20, JavaScript/CommonJS, Express, PostgreSQL, bcryptjs, jose
- Local base URL: `http://localhost:8080`
- Public operations:
  - `POST /api/v1/users`
  - `GET /api/v1/users`
  - `GET/PATCH /api/v1/users/{id}`
  - `POST /api/v1/teams`
  - `GET /api/v1/teams`
  - `GET/PATCH/DELETE /api/v1/teams/{id}`
  - `POST/GET /api/v1/teams/{id}/members`
  - `DELETE /api/v1/teams/{id}/members/{userId}`
- Health: `/health`
- User status values: `ACTIVE`, `INACTIVE`, `SUSPENDED`.
- Public user/team endpoints require bearer JWTs and permission claims.
- Relevant claims: `IAM_USER_MANAGE`, `IAM_USER_VIEW`, `IAM_TEAM_MANAGE`, `IAM_TEAM_VIEW`.
- Every create POST requires `Idempotency-Key`.
- Tenant scope comes from the JWT tenant claim.
- List endpoints support `page`, `size`, sorting, and filters.
- User profile reads are allowed for self; self `PATCH` is limited to `fullName`.
- Public password changes and hard user deletes are not exposed.
- Internal credential routes must never be called directly by the browser.

### 4.5 Document Service

- Implementation: [../Resolve_Document_Service](../Resolve_Document_Service)
- Stack: Node.js, Express, PostgreSQL, S3-compatible storage, Kafka
- Local base URL: `http://localhost:3000`
- Operations:
  - `POST /api/v1/cases/{caseId}/documents`
  - `GET /api/v1/cases/{caseId}/documents`
  - `GET /api/v1/cases/{caseId}/documents/{documentId}`
  - `GET /api/v1/cases/{caseId}/documents/{documentId}/download`
  - `POST /api/v1/cases/{caseId}/documents/{documentId}/versions`
  - `GET /api/v1/cases/{caseId}/documents/{documentId}/versions`
  - `GET /api/v1/cases/{caseId}/documents/{documentId}/versions/{versionNumber}/download`
- Upload and new-version POSTs use `multipart/form-data` and require `Idempotency-Key`.
- Initial upload supports `file` and optional `description`.
- New-version upload supports `file`.
- Download endpoints return `302` to a short-lived signed URL.
- Document scan statuses: `PENDING`, `CLEAN`, `INFECTED`, `FAILED`.
- Download can be denied when the configured scan gate requires `CLEAN`.
- Maximum size and blocked MIME types are server-configured and must not be hard-coded without a backend contract.
- Pagination uses `page` and `size`.

### 4.6 Audit Service

- Implementation: [../Audit_Service](../Audit_Service)
- Stack: Node.js, TypeScript, Express, Prisma, PostgreSQL, KafkaJS, Redis
- Local base URL: `http://localhost:3000`
- Operations:
  - `GET /health`
  - `GET /health/ready`
  - `GET /api/v1/audit`
- Audit retrieval is implemented but currently fails closed because an approved Audit-view permission adapter contract is not available.
- Filters: `id`, `resourceId`, `actorId`, `eventType`, `resourceType`, `from`, `to`.
- Pagination: zero-based `page`, `size` from 1–100.
- Sorting: `sort=<field>,<direction>`.
- Sort fields: `timestamp`, `createdAt`, `action`, `resourceType`, `actorId`.
- Response fields: `content`, `page`, `size`, `totalElements`, `totalPages`.
- Audit data is tenant-scoped and tenant identity comes from the verified JWT.

### 4.7 Planned, but absent in code

These modules must be marked as future work:

- Case Management Service
- Workflow & Work Execution Service
- Notification Service
- Case comments API
- Case search and assignment API
- Case state transitions API
- Workflow CRUD API
- Task CRUD and completion API
- Approval creation/decision API
- Notification delivery API
- Case analytics API
- WebSocket/SSE real-time API

The Kafka producer/consumer documentation references these domains, but documentation is not implementation evidence.

---

## 5. Authentication and authorization integration plan

### 5.1 Required frontend authentication flow

Add a root auth boundary before protected application routes:

1. `/login`
2. Login form fields:
   - organization slug or organization identifier
   - email
   - password
3. Call `POST /api/v1/auth/login`.
4. Handle:
   - `200`: store access/refresh token pair and initialize user session
   - `202`: route to MFA verification page
   - `401`: generic invalid-credentials message
   - `403`: account disabled/suspended message
   - `429`: rate-limit/retry state
5. Load the signed-in user's role and permission data from RBAC.
6. Render protected navigation and actions by permission, not by a frontend role-name string alone.
7. On protected API `401`, attempt `POST /api/v1/auth/refresh` once.
8. If refresh succeeds, update both tokens and retry the original request.
9. If refresh fails, clear session state and redirect to login.
10. Logout calls `POST /api/v1/auth/logout`, optionally with `refreshToken`, then clears local session state.

### 5.2 Required auth pages

Recommended routes:

- `/login`
- `/forgot-password`
- `/reset-password`
- `/mfa`
- `/profile/security`

Reset-password UX must state that delivery may be unavailable when no notification/email service is configured. Do not imply a link was delivered unless the backend confirms delivery.

### 5.3 Token storage recommendation

The frontend repository is a TanStack Start SSR application, so browser storage is not the only option. Prefer secure server-side session cookies or a well-defined backend-for-frontend proxy for refresh tokens. Do not place refresh or access tokens in unprotected application state or URL parameters.

If browser storage is the first implementation step, document the tradeoff and avoid storing refresh tokens in `localStorage` or exposing them through logs. This is an implementation recommendation, not backend evidence.

### 5.4 Permission model

Add a frontend permission gate based on canonical permission codes:

- `ORG_SETTINGS_MANAGE`
- `USER_MANAGE`, `USER_READ`
- `TEAM_MANAGE`, `TEAM_READ`
- `ROLE_MANAGE`
- `AUDIT_READ`
- `DOCUMENT_UPLOAD`, `DOCUMENT_READ`
- `AUTH_SETTINGS_MANAGE`
- any case/workflow/approval permission required once those services exist

Hide unavailable actions, and treat the backend response as authoritative. A hidden control is not a security boundary.

### 5.5 MFA

Current backend routes are implemented, but login may not always drive the MFA challenge. The frontend should support:

- status view
- enrollment QR/provisioning URI
- manual TOTP key display
- confirmation code
- challenge verification
- disable flow

Never log or persist MFA secrets or QR provisioning values longer than needed.

---

## 6. API integration architecture

### 6.1 Add shared infrastructure

The existing `resolve-store.tsx` should become a compatibility/demo store only until a service client layer is introduced. Recommended additions:

- `src/lib/api/client.ts`: shared fetch wrapper
- `src/lib/api/auth.ts`: login, refresh, logout, password reset, MFA
- `src/lib/api/organizations.ts`: organization API
- `src/lib/api/users.ts`: users and teams
- `src/lib/api/rbac.ts`: roles and permissions
- `src/lib/api/documents.ts`: document service
- `src/lib/api/audit.ts`: audit retrieval
- `src/lib/auth/session.tsx`: auth/session state and refresh coordination
- `src/lib/auth/permissions.tsx`: permission hooks and route guards

No API base URL is committed in the current frontend. Add environment-based configuration rather than hard-coded cross-service URLs.

Potential variables:

- `AUTH_SERVICE_URL`
- `ORGANIZATION_SERVICE_URL`
- `RBAC_SERVICE_URL`
- `USER_TEAM_SERVICE_URL`
- `DOCUMENT_SERVICE_URL`
- `AUDIT_SERVICE_URL`

The SSR and browser sides may need separate public/API gateway configuration in production. Prefer a reverse proxy or gateway that presents stable `/api/*` routes instead of exposing every service port to browsers.

### 6.2 Shared API behavior

Implement standardized handling for:

- `400`: validation and field errors
- `401`: refresh or sign out
- `403`: insufficient permission or inactive tenant
- `404`: preserve anti-enumeration behavior
- `409`: duplicate or idempotency conflict
- `429`: rate limiting
- `503`: service unavailable/readiness failure

Do not use generic toasts alone for validation errors. Display field-level errors from backend error payloads where the code exposes them.

### 6.3 Idempotency

Generating a stable `Idempotency-Key` is required for:

- organization creation
- user creation
- team creation
- team-member addition
- document upload
- document-version upload

The key should remain stable for an attempted request and be regenerated only for a new user action. A repeated submit of the same form should not create duplicates.

### 6.4 Pagination and sorting

Normalize backend differences into one UI table contract:

```ts
interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
```

List pages should implement:

- page number
- page size
- sorting
- loading skeleton
- empty state
- error state
- retry action
- disabled previous/next controls

Audit and document APIs use the same conceptual shape but must not be assumed to have the exact same backend response until their OpenAPI contracts are tested.

---

## 7. Module and route specification

## 7.1 Authentication module

Pages:

- login
- forgot password
- reset password
- MFA verification/enrollment
- profile security

Components:

- organization/email/password form
- password visibility control
- MFA code input
- provisioning QR/manual key panel
- session expiry banner
- signed-out fallback

States:

- idle
- submitting
- MFA challenge
- invalid credentials
- suspended tenant/account
- rate limited
- reset requested
- reset completed
- reset delivery unavailable
- MFA disabled/enabled

Role/permission: public routes except profile/security and token settings.

## 7.2 Dashboard module

Preserve the current dashboard visual layout, but make each source explicitly labeled:

- live data
- demo data
- unavailable service

Recommended live sections:

- organization status summary
- user/team totals
- recent audit activity
- document upload activity
- service readiness indicators

Do not present fabricated case/workflow totals unless Case Management exposes data.

## 7.3 Organization administration

Routes:

- `/organizations`
- `/organizations/new`
- `/organizations/:id`
- `/organizations/:id/settings`

Operations:

- create organization
- list/filter/sort organizations
- open organization detail
- update profile
- suspend/reactivate organization

Forms:

- name
- slug
- status

Validation:

- required name
- slug format and uniqueness
- status enum

Required permission: system administrator or the backend-defined organization authorization.

## 7.4 User management

Routes:

- `/users`
- `/users/:id`
- `/profile`

Operations:

- create user
- list/filter/sort users
- open user detail
- edit allowed profile fields
- view team memberships
- view assigned roles
- assign/revoke roles through RBAC

Fields:

- email
- username
- full name
- status

Client validation:

- email format
- username max 100 characters
- full name max 255 characters
- status enum

User update rules:

- manager/admin: allowed profile fields per the API
- self: `fullName` only
- no public password change or public hard delete

Required permission: `USER_MANAGE` or `USER_READ`.

## 7.5 Team management

Routes:

- `/teams`
- `/teams/:id`
- `/teams/:id/members`

Operations:

- create team
- rename/update team
- delete team
- list/search teams
- add/remove member
- list memberships

Fields:

- name (max 255 characters)

Required permission: `TEAM_MANAGE` or `TEAM_READ`.

## 7.6 Role and permission management

Routes:

- `/rbac/permissions`
- `/rbac/roles`
- `/rbac/roles/new`
- `/rbac/roles/:id`
- `/users/:id/roles`

Operations:

- list permission catalog
- list roles
- create custom role
- update custom role
- delete custom role
- assign role to user
- revoke role from user
- view effective user permissions

System-role UI must prevent update/delete actions.

Required permission: `ROLE_MANAGE`.

## 7.7 Document management

Place document UI in a future-ready case document tab and potentially in `/documents` as a tenant-wide index only if the API supports it. There is no tenant-wide document endpoint in the current contract.

Operations:

- upload
- list
- metadata detail
- download
- upload version
- version history
- download historical version

Required UI states:

- drag/drop or file picker
- selected file and size
- upload progress
- idempotency/retry state
- blocked MIME/size error
- PENDING/CLEAN/INFECTED/FAILED scan status
- signed-link redirect handling
- 403 due to permission or scan gate
- 404 for wrong tenant/case/document
- empty history
- version compare metadata

The existing prototype document upload modal stores only a filename and size. It must be replaced with an actual `multipart/form-data` file input.

## 7.8 Audit console

Route:

- `/audit`
- optional `/audit/resource/:resourceType/:resourceId`

Components:

- filter form
- event table/timeline
- date range
- resource/actor/event filters
- sortable columns
- pagination
- JSON payload drawer
- request/trace metadata view

Do not show audit data until `AUDIT_READ` is granted and the Audit Service permission adapter is live.

## 7.9 Token settings

Route:

- `/settings/authentication`

Operations:

- view effective per-tenant access/refresh token TTL settings
- update settings

Required permission: `AUTH_SETTINGS_MANAGE`.

## 7.10 Existing workflow/case routes

Routes already present:

- `/cases`
- `/cases/:id`
- `/workflows`
- `/workflows/:id`

They should remain in the app only with one of these labels:

- `Prototype` while backed only by `localStorage`
- `Integrated` after corresponding backend APIs exist

Do not silently present prototype actions as real platform operations.

---

## 8. Data mapping and migration from `resolve-store.tsx`

The existing store is the source of current demo types. It is not an API contract.

| Existing prototype type | Current behavior | Required backend mapping |
|---|---|---|
| `Workflow` | stage/node hierarchy in local state | future Workflow Service aggregate |
| `CaseRecord.status` | lowercase open/in_review/blocked/resolved | future Case status enum; cross-check actual API contract |
| `CaseRecord.priority` | low/medium/high | local field only; no documented implemented backend endpoint |
| `Comment` | nested comment threads | future Case comments endpoint |
| `AuditEvent.resourceType` | case/task/approval/document/comment/stage | Audit event contracts use event types and resource types; map via the audit payload |
| `DocumentRecord.scanStatus` | clean/pending | backend values are PENDING/CLEAN/INFECTED/FAILED |
| `Notification` | local unread dropdown | future Notification Service |
| `User.role` | single display role name | replace with RBAC role assignments and effective permission codes |
| `User.status` | active/disabled | backend user values are ACTIVE/INACTIVE/SUSPENDED |
| `Team` | name and description | backend team model is name plus organization; no description field in the documented current API |
| `ApprovalRequest` | pending/approved/rejected local state | future Workflow/Approval API |

Migration principle: preserve the UI components but replace data types and mutation methods with typed API queries/mutations. Do not copy prototype field names into backend API types.

---

## 9. React Query and state guidance

Use TanStack Query for all server state:

- long-lived organizations, users, teams, roles
- paginated and filtered audit/document lists
- session user and permission lists
- readiness and health status

Use React context/store for:

- active session
- selected organization/tenant
- UI-only state
- navigation drawer state
- ephemeral form state

Do not retain server entities in `localStorage` without an explicit cache policy.

Recommended query patterns:

- organization list: `['organizations', filters, page, size, sort]`
- organization detail: `['organizations', id]`
- users: `['users', organizationId, filters, page, size, sort]`
- teams: `['teams', organizationId, filters, page, size, sort]`
- team members: `['teams', teamId, 'members', page, size]`
- permission catalog: `['rbac', 'permissions']`
- roles: `['rbac', 'roles']`
- user roles: `['rbac', 'users', userId, 'roles']`
- effective permissions: `['rbac', 'users', userId, 'permissions']`
- documents: `['documents', 'cases', caseId, page, size]`
- document versions: `['documents', caseId, documentId, 'versions']`
- audit: `['audit', filters, page, size, sort]`

Use mutation invalidation keyed by exact entities. For example, assignment changes should invalidate user roles and effective permissions immediately.

---

## 10. Loading, empty, error, and success states

Every backend-connected module needs:

- initial skeleton or table-loading state
- mutation pending state and disabled submit controls
- empty state with relevant create action when permitted
- field-level validation errors
- 401 login/refresh state
- 403 denied state
- 404 anti-enumeration-safe state
- 409 duplicate/conflict message
- 503 service unavailable state
- success toast or inline confirmation
- stale/refetch state
- disabled state for system roles or cross-tenant resources

For document and audit pages, show the backend’s eventual/operational constraints explicitly. Audit records can lag Kafka ingestion, and document event publication can occur after the upload request.

---

## 11. Existing component reuse

Reuse these components before adding custom ones:

- `Shell` for page layout and navigation
- `Modal` for create/edit/confirm dialogs
- `PrimaryButton`, `GhostButton`, `DangerButton`
- `Field`, `TextInput`, `TextArea`, `Select`, `Tag`
- Radix UI table, tabs, dialog, sheet, dropdown, tooltip, and alert-dialog primitives
- existing CSS utility classes `rise`, `slidein`, `flowline`

Before introducing a new design system component, inspect [src/components/ui](./src/components/ui) for an existing Radix wrapper.

---

## 12. Proposed route additions

The following route names fit the TanStack file-router conventions:

- `src/routes/login.tsx`
- `src/routes/forgot-password.tsx`
- `src/routes/reset-password.tsx`
- `src/routes/mfa.tsx`
- `src/routes/profile.security.tsx`
- `src/routes/organizations.index.tsx`
- `src/routes/organizations.$id.tsx`
- `src/routes/users.index.tsx`
- `src/routes/users.$id.tsx`
- `src/routes/teams.index.tsx`
- `src/routes/teams.$id.tsx`
- `src/routes/rbac.permissions.tsx`
- `src/routes/rbac.roles.index.tsx`
- `src/routes/rbac.roles.$id.tsx`
- `src/routes/audit.index.tsx`
- `src/routes/settings.authentication.tsx`

Keep existing routes unless a migration is explicitly requested:

- `/organization` can remain initially as an organization/admin dashboard
- `/cases` and `/workflows` can remain prototype-ready shell routes
- `/cases/$id` can remain the integration target for future Case/Document APIs

Do not edit [src/routeTree.gen.ts](./src/routeTree.gen.ts) manually; regenerate through TanStack tooling.

---

## 13. Implementation phases

### Phase 1: foundation

- API client
- environment configuration
- auth/session provider
- login/logout/refresh
- permission hook
- route guards
- global error handling
- organization context

### Phase 2: tenant administration

- organization list/detail/create/update/status
- user list/detail/create/update
- team and membership management
- organization route migration

### Phase 3: RBAC

- permission catalog
- role CRUD
- user-role assignment/revocation
- effective permission UI
- server-driven action visibility
- token-settings UI

### Phase 4: document and audit

- document upload/list/detail/download/version UI
- audit list/filter/pagination/timeline
- scan-status handling
- signed download handling
- audit 403 denial state

### Phase 5: case/workflow integration

Only after real backend services exist:

- replace `resolve-store.tsx` mutations for workflows
- replace case prototype mutations
- connect comments and assignments
- connect task completion and stage transitions
- connect approval decisions
- connect notification events
- replace synthetic dashboard metrics

Do not implement this phase against the current repository documentation alone.

---

## 14. Security and privacy requirements

- Never put service credentials or secrets in frontend code or browser storage.
- Never expose internal service endpoints or internal service tokens in public browser APIs.
- Do not expose MFA secrets in logs or analytics.
- Do not hard-code organization, user, or RBAC test credentials.
- Send bearer JWTs only to public API endpoints that require them.
- Never forward end-user bearer tokens to internal service calls.
- Verify logout/refresh behavior with revoked refresh and access tokens.
- Do not rely on hidden controls for authorization; the backend enforces permissions.
- Use neutral error messages for login, password reset, and tenant lookup.
- Redact authorization, cookies, internal signatures, and secrets in frontend error reporting.
- Sanitize uploaded filenames and backend values in rendered text.
- Preserve cross-tenant 404 behavior instead of displaying different responses for missing or forbidden tenant resources.

---

## 15. Testing expectations

Use the existing frontend scripts:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run format`

Recommended frontend tests:

- auth login and MFA challenge flows
- refresh retry and logout behavior
- permission-gated navigation/actions
- organization create/update/status behavior
- user/team membership flows
- role assignment/revocation cache invalidation
- document multipart upload and idempotency-key reuse
- signed document download handling
- audit filter/pagination/error/forbidden states
- route guard redirects
- loading/empty/error states

Backend API contracts should be validated in integration tests using disposable databases and local service Compose stacks.

---

## 16. Non-goals

Do not implement or claim in the frontend:

- case/task APIs without a running Case or Workflow backend
- notification delivery without a Notification Service
- comments API without a Case Service contract
- workflow builder persistence without a Workflow API
- audit visibility while the Audit Read adapter remains fail-closed
- public internal credential or password-hash endpoints
- direct browser access to service databases
- direct browser access to Redis, Kafka, MySQL, PostgreSQL, or S3
- private key/JWKS management UI
- direct cross-service database joins

---

## 17. Recommended build brief for Lovable or a coding agent

Use the following as the high-level implementation prompt:

> Extend the existing `resolve-web` TanStack Start application. Preserve the frosted-console visual system, Shell layout, Tailwind/TanStack conventions, Radix components, and route structure. Replace local `resolve-store.tsx` prototype server state with typed service clients and TanStack Query only as the corresponding backend services become available. Implement Authentication, Organization, User/Team, RBAC, Document, and Audit modules. Add permission-based route/action guards. Do not invent Case, Workflow, Comment, Approval, or Notification APIs. Keep existing case/workflow screens clearly marked as prototypes until real Case and Workflow services exist. Add loading, empty, validation, forbidden, conflict, unavailable, and retry states. Do not expose secrets or internal service endpoints.

## 18. Final backend-readiness matrix

| Capability | Backend status | Frontend recommendation |
|---|---|---|
| Authentication | Implemented | integrate immediately |
| Password reset request/confirm | Implemented with delivery gap | integrate UI with delivery limitation |
| MFA | Implemented routes | integrate immediately |
| Organizations | Implemented | integrate immediately |
| Users | Implemented, partly complete | integrate public profile/team flows |
| Teams | Implemented | integrate immediately |
| RBAC roles/permissions | Implemented | integrate immediately |
| Token settings | Implemented | add settings page |
| Documents | Implemented | integrate case document UI |
| Audit retrieval | Implemented but authorization closed | implement UI with backend-denied state |
| Notifications | Documentation only | prototype dropdown only |
| Workflows | Documentation only | local prototype only |
| Cases | Documentation only | local prototype only |
| Comments | Documentation only | local prototype only |
| Approvals | Documentation only | local prototype only |
| Case analytics | Documentation only | use placeholders, not fake live metrics |

The frontend is ready to preserve and expand. It is not yet ready to claim a complete backend-connected product without the planned Case, Workflow, Approval, Comment, and Notification services.
