# db_myacademia API

RESTful backend for RP Kigali College's **Short Courses & Partner/Donor
Projects Registry**, built on Node.js, Express, and MySQL (mysql2/promise).

## 1. Database analysis (summary)

| Group | Tables |
|---|---|
| Lookups | `departments`, `academic_years`, `course_categories`, `delivery_modes`, `certification_types`, `accreditation_bodies`, `donors`, `partner_organisations`, `funding_types`, `sectors`, `beneficiary_types` |
| Access control | `roles`, `users`, `staff` |
| Registries | `short_courses`, `projects` |
| Many-to-many | `project_departments`, `project_partners` |
| Workflow | `approvals`, `audit_log` |
| Auth support (added) | `password_resets`, `token_blacklist` |

Key relationships:
- `users.role_id -> roles`, `users.department_id -> departments`
- `staff.department_id -> departments`, `staff.user_id -> users` (optional login link)
- `short_courses` references `departments`, `course_categories`, `delivery_modes`, `staff` (coordinator), `certification_types`, `accreditation_bodies`, `academic_years`, `users` (created_by)
- `projects` references `donors`, `funding_types`, `sectors`, `staff` (coordinator), `beneficiary_types`, `academic_years`, `users` (created_by)
- `projects` <-> `departments` and `projects` <-> `partner_organisations` are many-to-many via junction tables
- `approvals` is a generic sign-off record against either a `short_course` or a `project`
- `audit_log` stores JSON before/after snapshots of writes across the system

`short_courses.total_participants`, `short_courses.expected_revenue`, and
`projects.duration_months` are MySQL **GENERATED columns** — the API never
writes to them; they're always computed by the database.

## 2. Setup

```bash
cp .env.example .env        # fill in DB credentials + JWT secrets
npm install
npm run db:init             # applies database/schema.sql to MySQL
npm run dev                 # or: npm start
```

API base URL: `http://localhost:5000/api/v1`
Swagger UI: `http://localhost:5000/api-docs`
Postman collection: `docs/postman_collection.json`

## 3. Project structure

```
project/
├── config/        # env config, MySQL2 connection pool
├── controllers/    # request handlers (generic CRUD factory + auth/short-courses/projects)
├── middleware/     # auth (JWT), validation, error handling, rate limiting, uploads
├── models/         # entities.js (per-table config) + BaseRepository (generic DB layer)
├── routes/         # route definitions + validators
├── services/       # authService, auditService (business logic, DB transactions)
├── utils/          # ApiError, catchAsync, JWT helpers, query-feature builder
├── uploads/         # uploaded files (served at /uploads)
├── database/       # schema.sql + db:init script
├── docs/           # openapi.yaml + postman_collection.json
├── app.js          # Express app (middleware, routes, error handling)
└── server.js       # boots the HTTP server + DB connectivity check
```

## 4. How the generic CRUD engine works

Rather than hand-writing near-identical controllers/routes for all 20
tables, every lookup table (and `users`, `staff`, `approvals`, `audit_log`,
`project_departments`, `project_partners`) is described **once** in
`models/entities.js`: primary key, fillable columns, required fields,
foreign keys to validate, unique constraints, searchable/filterable/
sortable columns, and any joins to enrich responses.

`models/BaseRepository.js` and `controllers/crudControllerFactory.js` read
that config to provide, for every entity:
- `GET /resource?page=&limit=&search=&sort=&order=&<field>=` — pagination, search, filter, sort
- `GET /resource/:id` — enriched with joined lookup names
- `POST /resource` — validates FKs exist (no orphan records) + uniqueness (409 on conflict)
- `PUT /resource/:id` — partial update, same validation
- `DELETE /resource/:id` — 404 if missing; MySQL FK constraints prevent deleting referenced rows (mapped to a 409)

`short_courses` and `projects` have dedicated controllers
(`controllers/shortCourseController.js`, `controllers/projectController.js`)
that reuse the generic engine but add:
- app-level enforcement of the `total_certified <= total_participants` and `end_date >= start_date` CHECK constraints (clean 422 instead of a raw SQL error)
- `/summary` dashboard aggregation endpoints
- `/projects/:id/full` (mirrors the `v_projects_full` view) and nested `/projects/:id/departments`, `/projects/:id/partners` many-to-many endpoints

## 5. Authentication

`POST /auth/register`, `/login`, `/refresh-token`, `/logout`,
`/forgot-password`, `/reset-password`, `/change-password`, `GET|PUT /auth/me`.

- Passwords hashed with **bcrypt**.
- Access + refresh JWTs; logout inserts the token's `jti` into
  `token_blacklist` (checked on every authenticated request) — an
  effective, DB-backed logout/invalidation strategy without needing Redis.
- `forgot-password` stores a hashed, time-limited token in
  `password_resets`; the raw token would be emailed in production
  (returned directly in the response only outside `NODE_ENV=production`,
  since no email provider is wired up here).
- Auth endpoints are rate-limited (`middleware/rateLimiter.js`).

## 6. Role-based access

Role IDs (from the seeded `roles` table, see `utils/roles.js`):
`1=Principal, 2=Director of Planning, 3=HoD, 4=CDSM, 5=Coordinator, 6=Administrator`.

Write access (`POST/PUT/DELETE`) is restricted per resource in the route
files (e.g. lookup tables: Administrator/CDSM; `users`: Administrator
only). All `GET` endpoints require a valid JWT. Adjust the role arrays in
`routes/*.js` to match your institution's actual policy.

## 7. Security checklist

- Parameterized queries everywhere (`mysql2` `?` placeholders) — no string-built SQL
- `helmet`, `cors` (configurable origin), `morgan` request logging
- `express-validator` on every write endpoint
- Centralized error handler maps MySQL errors (`ER_DUP_ENTRY`, `ER_NO_REFERENCED_ROW`, `ER_ROW_IS_REFERENCED`, etc.) to clean 400/409 responses
- Secrets and DB credentials only via `.env` (see `.env.example`)
- Rate limiting on all `/auth/*` routes

## 8. Notes / assumptions

- The uploaded schema already used the name `db_myacademia`; `database/schema.sql` keeps that name and only **adds** `password_resets` and `token_blacklist` (needed for the auth flows requested) without touching any existing table, FK, index, or seed data.
- `audit_log` is exposed **read-only** through the API; rows are written internally whenever an audited controller (`users`, `short_courses`, `projects`, `approvals`) completes a create/update/delete.
- Seed user passwords in `schema.sql` are placeholders (`$2y$12$REPLACE_WITH_REAL_HASH`) — replace with real bcrypt hashes (or register fresh users via `/auth/register`) before using them to log in.
