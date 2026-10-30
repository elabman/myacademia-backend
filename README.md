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
| MoU registry (added, see §9) | `mou_agreements`, `mou_collaboration_links`, `partner_types`, `collaboration_areas` |

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
├── database/       # schema.sql + mou_schema.sql (add-on) + db:init / db:init-mou scripts
├── docs/           # openapi.yaml + postman_collection.json
├── app.js          # Express app (middleware, routes, error handling)
└── server.js       # boots the HTTP server + DB connectivity check
```

## 4. How the generic CRUD engine works

Rather than hand-writing near-identical controllers/routes for all
tables, every lookup table (and `users`, `staff`, `approvals`, `audit_log`,
`project_departments`, `project_partners`, `mou_collaboration_links`,
`partner_types`, `collaboration_areas`) is described **once** in
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

`short_courses`, `projects`, and `mou_agreements` have dedicated controllers
(`controllers/shortCourseController.js`, `controllers/projectController.js`,
`controllers/mouController.js`) that reuse the generic engine but add:
- app-level enforcement of CHECK constraints (`total_certified <= total_participants`, `end_date >= start_date`, `expiry_date >= effective_date`) — a clean 422 instead of a raw SQL error
- `/summary` dashboard aggregation endpoints
- `/projects/:id/full` and `/mou-agreements/:id/full` (mirroring the `v_projects_full` / `v_mou_agreements_full` views) plus their nested many-to-many endpoints

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
only; `mou_agreements`: Principal/HoD/CDSM/Administrator, matching the
`projects` policy). All `GET` endpoints require a valid JWT. Adjust the
role arrays in `routes/*.js` to match your institution's actual policy.

## 7. Security checklist

- Parameterized queries everywhere (`mysql2` `?` placeholders) — no string-built SQL
- `helmet`, `cors` (configurable origin), `morgan` request logging
- `express-validator` on every write endpoint
- Centralized error handler maps MySQL errors (`ER_DUP_ENTRY`, `ER_NO_REFERENCED_ROW`, `ER_ROW_IS_REFERENCED`, etc.) to clean 400/409 responses
- Secrets and DB credentials only via `.env` (see `.env.example`)
- Rate limiting on all `/auth/*` routes

## 8. Notes / assumptions

- The uploaded schema already used the name `db_myacademia`; `database/schema.sql` keeps that name and only **adds** `password_resets` and `token_blacklist` (needed for the auth flows requested) without touching any existing table, FK, index, or seed data.
- `audit_log` is exposed **read-only** through the API; rows are written internally whenever an audited controller (`users`, `short_courses`, `projects`, `mou_agreements`, `approvals`) completes a create/update/delete.
- Seed user passwords in `schema.sql` are placeholders (`$2y$12$REPLACE_WITH_REAL_HASH`) — replace with real bcrypt hashes (or register fresh users via `/auth/register`) before using them to log in.

## 9. MoU registry add-on (Sample_MoU_Database.xlsx)

Built from the first sheet ("MoU Master Database") of the uploaded
workbook. Shipped as a **separate migration**, `database/mou_schema.sql`,
so it can be imported into the database created in step 2 without
re-running the full schema:

```bash
npm run db:init-mou     # runs database/mou_schema.sql against db_myacademia
# or directly:
mysql -u root -p db_myacademia < database/mou_schema.sql
```

New tables (none of the original tables were modified):

| Table | Purpose |
|---|---|
| `partner_types` | Lookup: Private Company, Government Institution, NGO, University, Development Partner, International Organization |
| `collaboration_areas` | Lookup: Internship, Research, Staff Exchange, Curriculum Development, etc. |
| `mou_agreements` | One row per MoU: signing/effective/expiry dates, contact snapshot, purpose, status, progress, next action. Reuses the existing `partner_organisations`, `departments`, `staff`, `academic_years`, and `users` tables via FK rather than duplicating that data. |
| `mou_collaboration_links` | Many-to-many between `mou_agreements` and `collaboration_areas`, since the sheet's "Area(s) of Collaboration" column holds multiple semicolon-separated values (e.g. "Internship; Research; Staff Exchange") — mirrors the existing `project_departments` pattern. |

`mou_agreements.duration_months` is a **generated column** computed from
`effective_date`/`expiry_date`, and a CHECK constraint (also enforced at
the app layer, `controllers/mouController.js`) guarantees
`expiry_date >= effective_date`. A matching view, `v_mou_agreements_full`,
mirrors the style of `v_projects_full` / `v_short_courses_full`.

### New API endpoints

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/mou-agreements` | paginated/search/filter/sort |
| GET | `/mou-agreements/summary` | counts by status + expiring-within-90-days count |
| GET | `/mou-agreements/expiring?days=90` | active MoUs expiring soon, for renewal follow-up |
| GET | `/mou-agreements/:id` | joined with partner/type/department/focal person/academic year |
| GET | `/mou-agreements/:id/full` | above + linked collaboration areas |
| POST / PUT / DELETE | `/mou-agreements[/:id]` | HoD/CDSM/Principal/Administrator write; date-order validated |
| GET / POST | `/mou-agreements/:id/collaboration-areas` | list / link a collaboration area |
| DELETE | `/mou-agreements/:id/collaboration-areas/:areaId` | unlink |
| GET / POST / PUT / DELETE | `/partner-types`, `/collaboration-areas` | generic lookup CRUD (Administrator/CDSM write) |
| GET / POST / PUT / DELETE | `/mou-collaboration-links` | direct M2M table access, in addition to the nested routes above |

All are documented in `docs/openapi.yaml` (tag "MoU Agreements") and
included in `docs/postman_collection.json` (folder "MoU Agreements").

## 10. Public reviews add-on (staff Data Matrix reviews)

Each staff member gets a Data Matrix code (generated by the frontend) that
encodes `https://<frontend>/review/<staff_id>`. Scanning it opens a public
mobile page where a visitor picks a **service**, an emoji **rating (1-5)**
and optionally leaves a comment. Services are many-to-many with departments
and the page only offers the services of the scanned staff member's
department.

```bash
npm run db:init-reviews   # adds services, service_departments, reviews (safe to re-run)
```

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /public/reviews/staff/:staffId` | none | staff `{staff_id, full_name, department_name}` + `services` of their department. 404 for unknown/inactive staff. |
| `POST /public/reviews` | none | `{staff_id, service_id, rating 1-5, comment?, reviewer_name?}`. Rejects services not offered by the staff member's department (400). HTML tags are stripped. Rate limited: 1 per minute per network+staff, 30 per hour per network (429). |
| `GET /reviews`, `GET /reviews/:id` | Principal, Director of Planning, HoD, CDSM, Administrator | Includes `staff_name`, `service_name`, `department_name`. Filters: `staff_id`, `service_id`, `rating`, `created_at_gte`, `created_at_lte`; also `search`, `sort`, `page`, `limit` (default 100). |
| `GET/POST/PUT/DELETE /services` | read: any user; write: Administrator, CDSM, HoD | Send `department_ids: [1, 2]` on create/update; on update the links are **replaced** (omit the field to leave them unchanged). Responses include `departments: [{department_id, department_name}]`. A service that already has reviews cannot be deleted (409). |

Behind a reverse proxy set `app.set('trust proxy', 1)` in `app.js` so the rate
limits see each visitor's real IP instead of the proxy's.

