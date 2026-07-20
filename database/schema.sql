-- =====================================================================
-- RWANDA POLYTECHNIC - KIGALI COLLEGE
-- Short Courses & Partner/Donor Projects Registry — MySQL 8.0 Schema
-- =====================================================================
-- Source data modeled from:
--   1. short_courses_1.xlsx   (Short Courses Registry)
--   2. projects_principal.xlsx (Partner / Donor Projects Registry)
--
-- Design notes
-- ------------
-- * Fully normalized: repeating text (departments, donors, partners,
--   categories, delivery modes, etc.) is pulled into lookup tables so
--   reports stay consistent and typo-free.
-- * Money columns use DECIMAL, never FLOAT, to avoid rounding drift.
-- * "Total Participants" / "Expected Revenue" / "Duration (Months)" in
--   the spreadsheets are all *derived* numbers, so they are modeled as
--   MySQL GENERATED (computed) columns — always correct, never re-typed.
-- * Access control (users/roles) is modeled per the four roles you
--   requested: Principal, HoD, CDSM, Director of Planning — plus a
--   minimal Administrator/Coordinator role needed to actually run the
--   system day to day (clearly marked, easy to drop if not wanted).
-- * A lightweight approval workflow + audit log is included because
--   these four roles read like an oversight/sign-off chain rather than
--   pure data-entry accounts.
-- =====================================================================

DROP DATABASE IF EXISTS db_myacademia;
CREATE DATABASE db_myacademia
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE db_myacademia;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 1. REFERENCE / LOOKUP TABLES
-- =====================================================================

CREATE TABLE departments (
    department_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(150) NOT NULL,
    department_code VARCHAR(20)  NULL,
    is_active       TINYINT(1)   NOT NULL DEFAULT 1,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_department_name (department_name)
) ENGINE=InnoDB;

CREATE TABLE academic_years (
    academic_year_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    year_label        VARCHAR(20) NOT NULL,   -- e.g. '2022/2023'
    start_date         DATE NULL,
    end_date           DATE NULL,
    UNIQUE KEY uq_year_label (year_label)
) ENGINE=InnoDB;

CREATE TABLE course_categories (
    category_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(150) NOT NULL,
    UNIQUE KEY uq_category_name (category_name)
) ENGINE=InnoDB;

CREATE TABLE delivery_modes (
    delivery_mode_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mode_name        VARCHAR(50) NOT NULL,   -- In-Person, Online, Hybrid ...
    UNIQUE KEY uq_mode_name (mode_name)
) ENGINE=InnoDB;

CREATE TABLE certification_types (
    certification_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    certification_name VARCHAR(150) NOT NULL,
    UNIQUE KEY uq_certification_name (certification_name)
) ENGINE=InnoDB;

CREATE TABLE accreditation_bodies (
    accreditation_body_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    body_name             VARCHAR(200) NOT NULL,
    UNIQUE KEY uq_body_name (body_name)
) ENGINE=InnoDB;

CREATE TABLE donors (
    donor_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    donor_name VARCHAR(200) NOT NULL,   -- ERASMUS, MIGEPROF, ILO ...
    UNIQUE KEY uq_donor_name (donor_name)
) ENGINE=InnoDB;

CREATE TABLE partner_organisations (
    partner_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    partner_name VARCHAR(200) NOT NULL,   -- EAUR, UNIZA, ICT Chamber ...
    UNIQUE KEY uq_partner_name (partner_name)
) ENGINE=InnoDB;

CREATE TABLE funding_types (
    funding_type_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type_name       VARCHAR(50) NOT NULL,   -- Grant, MoU, Loan ...
    UNIQUE KEY uq_funding_type (type_name)
) ENGINE=InnoDB;

CREATE TABLE sectors (
    sector_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sector_name VARCHAR(150) NOT NULL,   -- Transport & Logistics, ICT, Mining ...
    UNIQUE KEY uq_sector_name (sector_name)
) ENGINE=InnoDB;

CREATE TABLE beneficiary_types (
    beneficiary_type_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type_name            VARCHAR(100) NOT NULL,  -- Students/Staff, Public, Girls & Young Women ...
    UNIQUE KEY uq_beneficiary_type (type_name)
) ENGINE=InnoDB;

-- =====================================================================
-- 2. ACCESS CONTROL: ROLES & USERS
-- =====================================================================

CREATE TABLE roles (
    role_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_name   VARCHAR(60) NOT NULL,
    description VARCHAR(255) NULL,
    UNIQUE KEY uq_role_name (role_name)
) ENGINE=InnoDB;

-- The four roles requested, plus two practical support roles
-- (Administrator, Coordinator) needed to actually run the system.
INSERT INTO roles (role_name, description) VALUES
    ('Principal',            'Overall head of college. Final sign-off on courses and projects; full read access to all registries.'),
    ('Director of Planning', 'Owns institutional planning, budgets and KPI tracking; approves budget/KPI fields and views cross-department reports.'),
    ('HoD',                  'Head of Department. Creates/edits short courses and projects for their own department only; submits for approval.'),
    ('CDSM',                 'Career Development & Skills Management office. Coordinates short-course delivery and donor/partner project data entry and validation across departments.'),
    ('Coordinator',          'Course or Project Coordinator. Can enter/update records they are assigned to as coordinator.'),
    ('Administrator',        'System administrator. Manages users, roles and lookup/reference data.');

CREATE TABLE users (
    user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,       -- store a bcrypt/argon2 hash, never plaintext
    role_id       INT UNSIGNED NOT NULL,
    department_id INT UNSIGNED NULL,           -- required/used for HoD (scopes them to one dept); NULL for college-wide roles
    phone         VARCHAR(30)  NULL,
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    last_login_at DATETIME     NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_email (email),
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_users_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_users_role (role_id),
    INDEX idx_users_department (department_id)
) ENGINE=InnoDB;

-- Staff / coordinators: people named as "Course Coordinator" or
-- "Project Coordinator (RP)" in the sheets. Kept separate from `users`
-- because most coordinators are academic staff, not necessarily
-- system-login accounts. If a coordinator *does* have a login,
-- staff.user_id links to it.
CREATE TABLE staff (
    staff_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NULL,
    phone         VARCHAR(30)  NULL,
    department_id INT UNSIGNED NULL,
    user_id       INT UNSIGNED NULL,           -- optional link to a login account
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    CONSTRAINT fk_staff_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_staff_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    UNIQUE KEY uq_staff_name_dept (full_name, department_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 3. SHORT COURSES REGISTRY
-- =====================================================================

CREATE TABLE short_courses (
    course_id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sn                      INT UNSIGNED NULL,                 -- original "S/N" from sheet, kept for traceability
    course_title            VARCHAR(255) NOT NULL,
    department_id           INT UNSIGNED NOT NULL,
    category_id             INT UNSIGNED NULL,
    duration_days            SMALLINT UNSIGNED NULL,
    duration_hours           SMALLINT UNSIGNED NULL,
    level                    ENUM('Beginner','Intermediate','Advanced') NOT NULL DEFAULT 'Intermediate',
    delivery_mode_id         INT UNSIGNED NULL,
    language                VARCHAR(100) NULL,                -- e.g. 'English', 'English/Kinyarwanda'
    target_audience          VARCHAR(255) NULL,
    prerequisites            VARCHAR(255) NULL,
    coordinator_id           INT UNSIGNED NULL,
    certification_id         INT UNSIGNED NULL,
    accreditation_body_id    INT UNSIGNED NULL,
    participants_female      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    participants_male        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    total_participants        SMALLINT UNSIGNED
        GENERATED ALWAYS AS (participants_female + participants_male) STORED,
    total_certified           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    fee_per_participant       DECIMAL(14,2) NOT NULL DEFAULT 0,   -- RWF
    expected_revenue          DECIMAL(16,2)
        GENERATED ALWAYS AS ((participants_female + participants_male) * fee_per_participant) STORED,
    status                   ENUM('Planning','Active','Completed','Cancelled') NOT NULL DEFAULT 'Planning',
    academic_year_id         INT UNSIGNED NULL,
    created_by                INT UNSIGNED NULL,
    created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_course_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_course_category
        FOREIGN KEY (category_id) REFERENCES course_categories(category_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_course_delivery_mode
        FOREIGN KEY (delivery_mode_id) REFERENCES delivery_modes(delivery_mode_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_course_coordinator
        FOREIGN KEY (coordinator_id) REFERENCES staff(staff_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_course_certification
        FOREIGN KEY (certification_id) REFERENCES certification_types(certification_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_course_accreditation
        FOREIGN KEY (accreditation_body_id) REFERENCES accreditation_bodies(accreditation_body_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_course_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(academic_year_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_course_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_course_certified_le_total
        CHECK (total_certified <= total_participants),

    INDEX idx_course_department (department_id),
    INDEX idx_course_status (status),
    INDEX idx_course_year (academic_year_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 4. PARTNER / DONOR PROJECTS REGISTRY
-- =====================================================================

CREATE TABLE projects (
    project_id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sn                        INT UNSIGNED NULL,
    project_title             VARCHAR(255) NOT NULL,
    donor_id                  INT UNSIGNED NULL,
    funding_type_id           INT UNSIGNED NULL,
    sector_id                 INT UNSIGNED NULL,
    project_coordinator_id    INT UNSIGNED NULL,             -- staff.staff_id, "Project Coordinator (RP)"
    start_date                DATE NULL,
    end_date                  DATE NULL,
    duration_months           SMALLINT UNSIGNED
        GENERATED ALWAYS AS (TIMESTAMPDIFF(MONTH, start_date, end_date)) STORED,
    total_budget_usd           DECIMAL(16,2) NULL,
    total_budget_rwf           DECIMAL(18,2) NULL,
    college_contribution_rwf   DECIMAL(18,2) NOT NULL DEFAULT 0,
    donor_contribution_usd     DECIMAL(16,2) NOT NULL DEFAULT 0,
    geographic_scope           VARCHAR(150) NULL,
    beneficiary_type_id        INT UNSIGNED NULL,
    no_direct_beneficiaries     INT UNSIGNED NULL,
    key_performance_indicator   VARCHAR(500) NULL,
    achievement_rate_pct        DECIMAL(5,2) NULL,            -- e.g. 64.00 for 64%
    remarks                    VARCHAR(500) NULL,
    overall_status              ENUM('Pipeline','Active','Completed','Suspended','Cancelled') NOT NULL DEFAULT 'Pipeline',
    academic_year_id            INT UNSIGNED NULL,
    created_by                  INT UNSIGNED NULL,
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_project_donor
        FOREIGN KEY (donor_id) REFERENCES donors(donor_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_project_funding_type
        FOREIGN KEY (funding_type_id) REFERENCES funding_types(funding_type_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_project_sector
        FOREIGN KEY (sector_id) REFERENCES sectors(sector_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_project_coordinator
        FOREIGN KEY (project_coordinator_id) REFERENCES staff(staff_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_project_beneficiary_type
        FOREIGN KEY (beneficiary_type_id) REFERENCES beneficiary_types(beneficiary_type_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_project_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(academic_year_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_project_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_project_dates
        CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),

    INDEX idx_project_status (overall_status),
    INDEX idx_project_donor (donor_id),
    INDEX idx_project_year (academic_year_id)
) ENGINE=InnoDB;

-- "Target Department(s)" is multi-valued in the sheet -> many-to-many
CREATE TABLE project_departments (
    project_id    INT UNSIGNED NOT NULL,
    department_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (project_id, department_id),
    CONSTRAINT fk_pd_project
        FOREIGN KEY (project_id) REFERENCES projects(project_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pd_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- "Partner Organisation(s)" is also multi-valued -> many-to-many
CREATE TABLE project_partners (
    project_id  INT UNSIGNED NOT NULL,
    partner_id  INT UNSIGNED NOT NULL,
    PRIMARY KEY (project_id, partner_id),
    CONSTRAINT fk_pp_project
        FOREIGN KEY (project_id) REFERENCES projects(project_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pp_partner
        FOREIGN KEY (partner_id) REFERENCES partner_organisations(partner_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 5. APPROVAL WORKFLOW  (Principal / Director of Planning / HoD / CDSM
--    sign-off trail for a course or project record)
-- =====================================================================

CREATE TABLE approvals (
    approval_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type     ENUM('short_course','project') NOT NULL,
    entity_id       INT UNSIGNED NOT NULL,          -- course_id or project_id
    requested_by    INT UNSIGNED NOT NULL,
    role_required   INT UNSIGNED NOT NULL,          -- which role must act (roles.role_id)
    reviewer_id     INT UNSIGNED NULL,
    decision        ENUM('Pending','Approved','Rejected','Returned') NOT NULL DEFAULT 'Pending',
    comments        VARCHAR(500) NULL,
    decision_date   DATETIME NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_approval_requested_by
        FOREIGN KEY (requested_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_approval_role
        FOREIGN KEY (role_required) REFERENCES roles(role_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_approval_reviewer
        FOREIGN KEY (reviewer_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    INDEX idx_approval_entity (entity_type, entity_id),
    INDEX idx_approval_decision (decision)
) ENGINE=InnoDB;

-- =====================================================================
-- 6. AUDIT LOG (who changed what, useful for a registry several roles
--    write to)
-- =====================================================================

CREATE TABLE audit_log (
    log_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NULL,
    table_name  VARCHAR(64) NOT NULL,
    record_id   INT UNSIGNED NOT NULL,
    action      ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    old_values  JSON NULL,
    new_values  JSON NULL,
    action_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_audit_table_record (table_name, record_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 7. REPORTING VIEWS
-- =====================================================================

CREATE OR REPLACE VIEW v_short_courses_full AS
SELECT
    sc.course_id,
    sc.course_title,
    d.department_name,
    cc.category_name,
    sc.duration_days,
    sc.duration_hours,
    sc.level,
    dm.mode_name              AS delivery_mode,
    sc.language,
    sc.target_audience,
    sc.prerequisites,
    st.full_name              AS coordinator_name,
    ct.certification_name,
    ab.body_name              AS accreditation_body,
    sc.participants_female,
    sc.participants_male,
    sc.total_participants,
    sc.total_certified,
    sc.fee_per_participant,
    sc.expected_revenue,
    sc.status,
    ay.year_label              AS academic_year
FROM short_courses sc
LEFT JOIN departments d          ON d.department_id = sc.department_id
LEFT JOIN course_categories cc   ON cc.category_id = sc.category_id
LEFT JOIN delivery_modes dm      ON dm.delivery_mode_id = sc.delivery_mode_id
LEFT JOIN staff st                ON st.staff_id = sc.coordinator_id
LEFT JOIN certification_types ct ON ct.certification_id = sc.certification_id
LEFT JOIN accreditation_bodies ab ON ab.accreditation_body_id = sc.accreditation_body_id
LEFT JOIN academic_years ay       ON ay.academic_year_id = sc.academic_year_id;

CREATE OR REPLACE VIEW v_projects_full AS
SELECT
    p.project_id,
    p.project_title,
    ANY_VALUE(dn.donor_name)     AS donor_name,
    ANY_VALUE(ft.type_name)      AS funding_type,
    ANY_VALUE(sec.sector_name)   AS sector_name,
    ANY_VALUE(st.full_name)      AS coordinator_name,
    p.start_date,
    p.end_date,
    p.duration_months,
    p.total_budget_usd,
    p.total_budget_rwf,
    p.college_contribution_rwf,
    p.donor_contribution_usd,
    p.geographic_scope,
    ANY_VALUE(bt.type_name)      AS beneficiary_type,
    p.no_direct_beneficiaries,
    p.key_performance_indicator,
    p.achievement_rate_pct,
    p.remarks,
    p.overall_status,
    ANY_VALUE(ay.year_label)     AS academic_year,
    GROUP_CONCAT(DISTINCT dep.department_name ORDER BY dep.department_name SEPARATOR ', ') AS target_departments,
    GROUP_CONCAT(DISTINCT po.partner_name ORDER BY po.partner_name SEPARATOR ', ')          AS partner_organisations
FROM projects p
LEFT JOIN donors dn                 ON dn.donor_id = p.donor_id
LEFT JOIN funding_types ft          ON ft.funding_type_id = p.funding_type_id
LEFT JOIN sectors sec               ON sec.sector_id = p.sector_id
LEFT JOIN staff st                  ON st.staff_id = p.project_coordinator_id
LEFT JOIN beneficiary_types bt      ON bt.beneficiary_type_id = p.beneficiary_type_id
LEFT JOIN academic_years ay         ON ay.academic_year_id = p.academic_year_id
LEFT JOIN project_departments pdpt  ON pdpt.project_id = p.project_id
LEFT JOIN departments dep           ON dep.department_id = pdpt.department_id
LEFT JOIN project_partners ppar     ON ppar.project_id = p.project_id
LEFT JOIN partner_organisations po  ON po.partner_id = ppar.partner_id
GROUP BY p.project_id;

-- Pending items awaiting a given role's decision (drives each role's dashboard)
CREATE OR REPLACE VIEW v_pending_approvals AS
SELECT
    a.approval_id,
    a.entity_type,
    a.entity_id,
    CASE WHEN a.entity_type = 'short_course' THEN sc.course_title ELSE p.project_title END AS title,
    r.role_name          AS role_required,
    u.full_name          AS requested_by,
    a.created_at
FROM approvals a
JOIN roles r          ON r.role_id = a.role_required
JOIN users u          ON u.user_id = a.requested_by
LEFT JOIN short_courses sc ON a.entity_type = 'short_course' AND sc.course_id = a.entity_id
LEFT JOIN projects p       ON a.entity_type = 'project'      AND p.project_id  = a.entity_id
WHERE a.decision = 'Pending';

-- =====================================================================
-- 8. SEED DATA — lookups derived directly from the two source files
-- =====================================================================

INSERT INTO departments (department_name) VALUES
    ('Automobile Technology'),
    ('Mining Engineering'),
    ('Mechanical Engineering'),
    ('Civil Engineering'),
    ('ICT'),
    ('Transport and Logistics Department'),
    ('EEE'),
    ('Creative Art');

INSERT INTO academic_years (year_label) VALUES
    ('2022/2023'),
    ('2025/2026');

INSERT INTO course_categories (category_name) VALUES
    ('Automobile'), ('Mining Technology'), ('Air Condition'),
    ('Manufacturing'), ('Plumbing Technology'), ('IT');

INSERT INTO delivery_modes (mode_name) VALUES ('In-Person'), ('Online'), ('Hybrid');

INSERT INTO certification_types (certification_name) VALUES
    ('Certificate of Completion'), ('Certificate of Competence');

INSERT INTO accreditation_bodies (body_name) VALUES
    ('RP Kigali College and BIWE'),
    ('RP Kigali College and MIGEPROF'),
    ('RP Kigali College'),
    ('RP-KIGALI College');

INSERT INTO donors (donor_name) VALUES ('ERASMUS'), ('MIGEPROF'), ('ILO');

INSERT INTO partner_organisations (partner_name) VALUES
    ('EAUR'), ('UNIZA'), ('MWSLiT'), ('MIGEPROGR'), ('ICT Chamber');

INSERT INTO funding_types (type_name) VALUES ('Grant'), ('MoU'), ('Loan');

INSERT INTO sectors (sector_name) VALUES
    ('Transport and Logistics'), ('Mining Sector'), ('ICT');

INSERT INTO beneficiary_types (type_name) VALUES
    ('Students / Staff'), ('Girls and Young Women'), ('Public');

-- =====================================================================
-- 9. SEED USERS (one example per requested role — replace password
--    hashes with real bcrypt/argon2 hashes before going to production)
-- =====================================================================

INSERT INTO users (full_name, email, password_hash, role_id, department_id) VALUES
    ('Alice Ikuzwe',      'aikuzwe@rp.ac.rw',   '$2y$12$REPLACE_WITH_REAL_HASH', (SELECT role_id FROM roles WHERE role_name='Principal'), NULL),
    ('Louis Habugusenga',  'planning@rp.ac.rw',    '$2y$12$REPLACE_WITH_REAL_HASH', (SELECT role_id FROM roles WHERE role_name='Director of Planning'), NULL),
    ('Jean Claude Ntiranta',              'hod.ict@rp.ac.rw',      '$2y$12$REPLACE_WITH_REAL_HASH', (SELECT role_id FROM roles WHERE role_name='HoD'), (SELECT department_id FROM departments WHERE department_name='ICT')),
    ('Charles Gakomeye',           'cdsm@rp.ac.rw',         '$2y$12$REPLACE_WITH_REAL_HASH', (SELECT role_id FROM roles WHERE role_name='CDSM'), NULL),
    ('System Admin',           'admin@rp.ac.rw',        '$2y$12$REPLACE_WITH_REAL_HASH', (SELECT role_id FROM roles WHERE role_name='Administrator'), NULL);

-- =====================================================================
-- 10. SAMPLE STAFF (coordinators appearing in the two registries)
-- =====================================================================

INSERT INTO staff (full_name, department_id) VALUES
    ('Louis HABAGUSENGA',      (SELECT department_id FROM departments WHERE department_name='Automobile Technology')),
    ('MUSIGWA Regis',           (SELECT department_id FROM departments WHERE department_name='Mining Engineering')),
    ('HAKUZIMANA Joseph',       (SELECT department_id FROM departments WHERE department_name='Mechanical Engineering')),
    ('Jean De Dieu IYAKARE',    (SELECT department_id FROM departments WHERE department_name='Civil Engineering')),
    ('Donatien SABUSHIMIKE',    (SELECT department_id FROM departments WHERE department_name='ICT')),
    ('Mr. Samuel Makuza',       (SELECT department_id FROM departments WHERE department_name='Transport and Logistics Department')),
    ('Dr. NDUKO Nyasetia Fred', (SELECT department_id FROM departments WHERE department_name='Mining Engineering')),
    ('MUNYANEZA Adolphe',       (SELECT department_id FROM departments WHERE department_name='ICT'));

-- =====================================================================
-- 11. SAMPLE DATA — Short Courses (from short_courses_1.xlsx)
-- =====================================================================

INSERT INTO short_courses
    (sn, course_title, department_id, category_id, duration_days, duration_hours, level,
     delivery_mode_id, language, target_audience, coordinator_id, certification_id,
     accreditation_body_id, participants_female, participants_male, total_certified,
     fee_per_participant, status, academic_year_id)
VALUES
    (1, 'Dual Training in Automotive Technology',
        (SELECT department_id FROM departments WHERE department_name='Automobile Technology'),
        (SELECT category_id FROM course_categories WHERE category_name='Automobile'),
        240, 1680, 'Intermediate',
        (SELECT delivery_mode_id FROM delivery_modes WHERE mode_name='In-Person'),
        'English', 'Entrepreneurs, Youth',
        (SELECT staff_id FROM staff WHERE full_name='Louis HABAGUSENGA'),
        (SELECT certification_id FROM certification_types WHERE certification_name='Certificate of Completion'),
        (SELECT accreditation_body_id FROM accreditation_bodies WHERE body_name='RP Kigali College and BIWE'),
        3, 25, 25, 0, 'Completed',
        (SELECT academic_year_id FROM academic_years WHERE year_label='2022/2023')),

    (2, 'Mining Skills',
        (SELECT department_id FROM departments WHERE department_name='Mining Engineering'),
        (SELECT category_id FROM course_categories WHERE category_name='Mining Technology'),
        60, 290, 'Intermediate',
        (SELECT delivery_mode_id FROM delivery_modes WHERE mode_name='In-Person'),
        'English/Kinyarwanda', 'Young Woman and Girls',
        (SELECT staff_id FROM staff WHERE full_name='MUSIGWA Regis'),
        (SELECT certification_id FROM certification_types WHERE certification_name='Certificate of Completion'),
        (SELECT accreditation_body_id FROM accreditation_bodies WHERE body_name='RP Kigali College and MIGEPROF'),
        30, 0, 30, 300000, 'Completed',
        (SELECT academic_year_id FROM academic_years WHERE year_label='2022/2023')),

    (3, 'Air Conditioning and Refrigeration',
        (SELECT department_id FROM departments WHERE department_name='Mechanical Engineering'),
        (SELECT category_id FROM course_categories WHERE category_name='Air Condition'),
        80, 640, 'Intermediate',
        (SELECT delivery_mode_id FROM delivery_modes WHERE mode_name='In-Person'),
        'English/Kinyarwanda', 'Youth',
        (SELECT staff_id FROM staff WHERE full_name='HAKUZIMANA Joseph'),
        (SELECT certification_id FROM certification_types WHERE certification_name='Certificate of Completion'),
        (SELECT accreditation_body_id FROM accreditation_bodies WHERE body_name='RP Kigali College'),
        4, 16, 20, 0, 'Completed',
        (SELECT academic_year_id FROM academic_years WHERE year_label='2022/2023')),

    (4, 'Industry Machinery',
        (SELECT department_id FROM departments WHERE department_name='Mechanical Engineering'),
        (SELECT category_id FROM course_categories WHERE category_name='Manufacturing'),
        80, 640, 'Intermediate',
        (SELECT delivery_mode_id FROM delivery_modes WHERE mode_name='In-Person'),
        'English/Kinyarwanda', 'Youth',
        (SELECT staff_id FROM staff WHERE full_name='HAKUZIMANA Joseph'),
        (SELECT certification_id FROM certification_types WHERE certification_name='Certificate of Completion'),
        (SELECT accreditation_body_id FROM accreditation_bodies WHERE body_name='RP Kigali College'),
        3, 22, 25, 0, 'Completed',
        (SELECT academic_year_id FROM academic_years WHERE year_label='2022/2023')),

    (5, 'Short Course in Plumbing',
        (SELECT department_id FROM departments WHERE department_name='Civil Engineering'),
        (SELECT category_id FROM course_categories WHERE category_name='Plumbing Technology'),
        180, 720, 'Intermediate',
        (SELECT delivery_mode_id FROM delivery_modes WHERE mode_name='In-Person'),
        'English/Kinyarwanda', 'Youth',
        (SELECT staff_id FROM staff WHERE full_name='Jean De Dieu IYAKARE'),
        (SELECT certification_id FROM certification_types WHERE certification_name='Certificate of Competence'),
        (SELECT accreditation_body_id FROM accreditation_bodies WHERE body_name='RP-KIGALI College'),
        6, 14, 18, 436500, 'Completed',
        (SELECT academic_year_id FROM academic_years WHERE year_label='2022/2023')),

    (6, 'Short Course in ICT',
        (SELECT department_id FROM departments WHERE department_name='ICT'),
        (SELECT category_id FROM course_categories WHERE category_name='IT'),
        80, 640, 'Intermediate',
        (SELECT delivery_mode_id FROM delivery_modes WHERE mode_name='In-Person'),
        'English/Kinyarwanda', 'Youth',
        (SELECT staff_id FROM staff WHERE full_name='Donatien SABUSHIMIKE'),
        (SELECT certification_id FROM certification_types WHERE certification_name='Certificate of Competence'),
        (SELECT accreditation_body_id FROM accreditation_bodies WHERE body_name='RP-KIGALI College'),
        17, 23, 40, 400000, 'Completed',
        (SELECT academic_year_id FROM academic_years WHERE year_label='2022/2023'));

-- =====================================================================
-- 12. SAMPLE DATA — Projects (from projects_principal.xlsx)
-- =====================================================================

INSERT INTO projects
    (sn, project_title, donor_id, funding_type_id, sector_id, project_coordinator_id,
     start_date, end_date, total_budget_usd, total_budget_rwf, college_contribution_rwf,
     donor_contribution_usd, geographic_scope, beneficiary_type_id, no_direct_beneficiaries,
     key_performance_indicator, achievement_rate_pct, remarks, overall_status, academic_year_id)
VALUES
    (1, 'DIGILOG',
        (SELECT donor_id FROM donors WHERE donor_name='ERASMUS'),
        (SELECT funding_type_id FROM funding_types WHERE type_name='Grant'),
        (SELECT sector_id FROM sectors WHERE sector_name='Transport and Logistics'),
        (SELECT staff_id FROM staff WHERE full_name='Mr. Samuel Makuza'),
        '2026-01-01', '2028-12-31', 94155.00, 161436279.90, 0, 94155.00,
        'RP Kigali Campus', (SELECT beneficiary_type_id FROM beneficiary_types WHERE type_name='Students / Staff'),
        NULL, 'Lab capacity (Digital logistics lab)', NULL, NULL, 'Pipeline',
        (SELECT academic_year_id FROM academic_years WHERE year_label='2025/2026')),

    (2, 'Supporting Girls and Young Women to Acquire Skills and Knowledge in the Mining Sector',
        (SELECT donor_id FROM donors WHERE donor_name='MIGEPROF'),
        (SELECT funding_type_id FROM funding_types WHERE type_name='MoU'),
        (SELECT sector_id FROM sectors WHERE sector_name='Mining Sector'),
        (SELECT staff_id FROM staff WHERE full_name='Dr. NDUKO Nyasetia Fred'),
        '2025-08-01', '2026-06-30', 99524.40, 105505120.00, 0, 99524.40,
        'RP Kigali Campus', (SELECT beneficiary_type_id FROM beneficiary_types WHERE type_name='Girls and Young Women'),
        90, 'Training completion rate', 64.00, 'Well progressing', 'Active',
        (SELECT academic_year_id FROM academic_years WHERE year_label='2025/2026')),

    (3, 'Kigali Smart Skills Hub for Youth Employment in Digital Transformation Economy',
        (SELECT donor_id FROM donors WHERE donor_name='ILO'),
        (SELECT funding_type_id FROM funding_types WHERE type_name='Grant'),
        (SELECT sector_id FROM sectors WHERE sector_name='ICT'),
        (SELECT staff_id FROM staff WHERE full_name='MUNYANEZA Adolphe'),
        '2026-03-01', '2026-12-31', 50000.00, 75000000.00, 22000000.00, 50000.00,
        'RP Kigali Campus', (SELECT beneficiary_type_id FROM beneficiary_types WHERE type_name='Public'),
        540, 'Trainees'' employment', NULL, 'It is progressing', 'Active',
        (SELECT academic_year_id FROM academic_years WHERE year_label='2025/2026'));

-- Multi-valued project fields
INSERT INTO project_departments (project_id, department_id) VALUES
    (1, (SELECT department_id FROM departments WHERE department_name='Transport and Logistics Department')),
    (2, (SELECT department_id FROM departments WHERE department_name='Mining Engineering')),
    (3, (SELECT department_id FROM departments WHERE department_name='ICT')),
    (3, (SELECT department_id FROM departments WHERE department_name='EEE')),
    (3, (SELECT department_id FROM departments WHERE department_name='Creative Art')),
    (3, (SELECT department_id FROM departments WHERE department_name='Mechanical Engineering')),
    (3, (SELECT department_id FROM departments WHERE department_name='Civil Engineering'));

INSERT INTO project_partners (project_id, partner_id) VALUES
    (1, (SELECT partner_id FROM partner_organisations WHERE partner_name='EAUR')),
    (1, (SELECT partner_id FROM partner_organisations WHERE partner_name='UNIZA')),
    (1, (SELECT partner_id FROM partner_organisations WHERE partner_name='MWSLiT')),
    (2, (SELECT partner_id FROM partner_organisations WHERE partner_name='MIGEPROGR')),
    (3, (SELECT partner_id FROM partner_organisations WHERE partner_name='ICT Chamber'));

-- =====================================================================
-- 13. OPTIONAL — DB-LEVEL ROLE-BASED ACCESS (MySQL 8 native roles)
-- Mirrors the application-level `roles` table with real MySQL
-- privileges, useful if tools/BI dashboards connect directly to MySQL
-- instead of going through an application layer.
-- =====================================================================

-- CREATE ROLE 'role_principal', 'role_director_planning', 'role_hod', 'role_cdsm', 'role_admin';
--
-- -- Principal & Director of Planning: read everything, no deletes
-- GRANT SELECT ON db_myacademia.* TO 'role_principal';
-- GRANT SELECT ON db_myacademia.* TO 'role_director_planning';
-- GRANT UPDATE (achievement_rate_pct, remarks, overall_status) ON db_myacademia.projects TO 'role_director_planning';
--
-- -- HoD: full read, and write only within short_courses/projects (app layer enforces dept scoping)
-- GRANT SELECT, INSERT, UPDATE ON db_myacademia.short_courses TO 'role_hod';
-- GRANT SELECT, INSERT, UPDATE ON db_myacademia.projects TO 'role_hod';
-- GRANT SELECT ON db_myacademia.* TO 'role_hod';
--
-- -- CDSM: manage short courses & partner project entries college-wide
-- GRANT SELECT, INSERT, UPDATE ON db_myacademia.short_courses TO 'role_cdsm';
-- GRANT SELECT, INSERT, UPDATE ON db_myacademia.projects TO 'role_cdsm';
-- GRANT SELECT, INSERT, UPDATE ON db_myacademia.project_departments TO 'role_cdsm';
-- GRANT SELECT, INSERT, UPDATE ON db_myacademia.project_partners TO 'role_cdsm';
-- GRANT SELECT ON db_myacademia.* TO 'role_cdsm';
--
-- -- Admin: everything, including user/role management
-- GRANT ALL PRIVILEGES ON db_myacademia.* TO 'role_admin';
--
-- -- Example: attach a role to a login
-- -- CREATE USER 'ictdean'@'%' IDENTIFIED BY 'change_me';
-- -- GRANT 'role_hod' TO 'ictdean'@'%';
-- -- SET DEFAULT ROLE 'role_hod' TO 'ictdean'@'%';

-- =====================================================================
-- END OF SCRIPT
-- =====================================================================
-- =====================================================================
-- 14. API AUTH SUPPORT TABLES (added for the Node.js/Express backend)
-- These support password-reset and JWT logout/blacklist flows used by
-- the REST API. They do not alter any existing table, FK, or index.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE password_resets (
    reset_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED NOT NULL,
    token_hash   VARCHAR(255) NOT NULL,
    expires_at   DATETIME NOT NULL,
    used         TINYINT(1) NOT NULL DEFAULT 0,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reset_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_reset_token (token_hash),
    INDEX idx_reset_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE token_blacklist (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED NOT NULL,
    jti          VARCHAR(100) NOT NULL,
    expires_at   DATETIME NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_blacklist_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_blacklist_jti (jti),
    INDEX idx_blacklist_expiry (expires_at)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- END OF UPDATED SCRIPT (db_myacademia)
-- =====================================================================
