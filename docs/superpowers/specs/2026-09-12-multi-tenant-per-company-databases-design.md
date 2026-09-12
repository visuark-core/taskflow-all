# Multi-Tenant Data Isolation — Per-Company Databases

Date: 2026-09-12
Status: Approved (sections 1–6)
Decision: Option C — separate Postgres database per company, auto-provisioned at workspace creation.

## Problem

Today the app stores all companies' data in one shared Postgres database. Only salaries and
billing settings reference `company`; most tables (Clients, Projects, Tasks, Invoices, etc.)
have no company scoping at all. Users of different companies can see each other's data.

Requirement (from stakeholder): each company gets its own separate set of data. Users of the
same company see that company's data; users of another company see only their own.

## Decisions (from brainstorm)

- Isolation model: **separate database per company** (Option C).
- Hosting: move/run on a **Postgres host where the app role can `CREATE DATABASE`** so
  workspace creation auto-provisions a tenant database (self-hosted, or Neon/Railway/DO).
  Supabase is the current host but cannot `CREATE DATABASE` in-app → leaving Supabase is a
  deployment task owned during rollout; the code targets any DB-owner-capable host.
- Company creation: **admin creates workspaces** (no self-serve database provisioning).
- User accounts: **global Users table** (identity/login in primary DB); only business data is
  per-company.
- Existing data: **migrated** into per-company databases.

## Architecture

### Primary (control) database
- `Users` — global identity, login (existing model, keeps its `company` field as the tenant link).
- `Companies` — NEW table: `id`, `name`, `slug` (unique), `dbHost`, `dbPort`, `dbName`,
  `status` (`provisioning` | `active`), `createdAt`, `updatedAt`.

### Per-company tenant database: `taskflow_<slug>`
- Contains all business models with **no `Users` and no `Companies`**:
  `Clients, Projects, Tasks, Teams, Departments, Services, Expenses, Invoices, InvoiceItems,
  SalaryDetails, SalaryPayouts, Notifications, Activities, Messages, TaskAttachments,
  TaskComments, TaskLabels, ProjectMembers, TeamMembers, DepartmentMembers,
  CompanyBillingSettings`.
- The database itself is the tenant boundary — **no `company` WHERE-clause scoping needed**.
- Existing `company` columns on `Client`/`Expense` remain business fields (client's org /
  expense entity), not tenant keys.

## Error/Edge behavior
- Unknown/`provisioning` company on register → 400 with clear message.
- Tenant DB unreachable → 503 per-request; tenant cache invalidates on company delete/update.
- Duplicate slug → 400 (unique constraint + pre-check).
- `CREATE DATABASE` in a transaction is impossible → each provisioning step is idempotent and
  resumed on retry (status field drives retry from last failed step).

## Security
- Tenant Sequelize instances are isolated per company slug in a cache; company A has no handle
  to company B's instance.
- Slug validated `^[a-z0-9][a-z0-9-]*$` before use in `CREATE DATABASE` (SQL injection guard;
  database identifiers must be quoted).
- `TENANT_OWNER_DATABASE_URL` is a DB-owner role (server env only, never exposed).

## Components

### Backend
1. `models/Company.js` — Companies registry (primary DB).
2. `services/tenantManager.js` —
   - `provisionCompany(company)` → `CREATE DATABASE taskflow_<slug>` (via owner URL) → sync
     tenant schema → mark `active` (idempotent, resumable).
   - `getTenantDb(slug)` → cached per-tenant Sequelize instance (lazy, pool per tenant).
   - `syncAllTenants()` → loop active companies, `sequelize.sync({alter:true})` each.
3. `middleware/tenantRouter.js` — after `protect`; resolves `req.user.company` → Company row →
   `req.tenant = { slug, dbName, models }`.
4. Controller changes — all handlers in `controllers/*.js` switch from top-level
   `require('../models')` to `req.tenant.models`.
5. `express`/`sync-db.js` — tenant-aware sync.
6. New routes `routes/companies.js` (admin-gated):
   - `POST /api/companies` — create workspace + provision DB (admin).
   - `GET /api/companies` — list (for register UI).
   - `POST /api/companies/sync-all` — schema evolution sweep (admin).

### Auth
- Register requires `company` to reference an `active` Companies row.
- Login/JWT unchanged (`req.user.company` already in token).

### Frontend
- Register/Install: company becomes a select from existing active workspaces.
- No API URL change; tenant routing is server-side. Company badge deferred to UI-redesign.

### Migration (`migrate-tenants.js`, one-time)
1. Group Users by distinct `company` → Companies rows (status `provisioning`).
2. Per company: provision DB, sync schema, copy rows per table using the company column where
   it exists, else relationship traversal (Client.company; Project→owner→User.company;
   Task→Project→owner; Team→ProjectMember/TeamMember→User; etc.).
3. Mark `active`; print per-company row counts.

## Testing
- Local sandbox: per-user Postgres cluster `127.0.0.1:55432` (superuser `tony`) exercises the
  real provisioning flow (CREATE DATABASE + schema sync + router).
- Scenario tests: two companies, same data shapes, verify no cross-company reads; register
  rejects inactive/unknown companies; provisioning resumes on partial failure.

## Rollout / Deployment constraints
- Production host must allow `CREATE DATABASE` (flag: current Supabase cannot).
- Env additions: `TENANT_OWNER_DATABASE_URL`, `DATABASE_URL` (primary/control).
- Sync-all sweep runs after deploy so all tenants get new schema.