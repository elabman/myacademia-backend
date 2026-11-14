-- =====================================================================
-- db_myacademia — MoU (Memorandum of Understanding) REGISTRY ADD-ON
-- =====================================================================
-- Standalone migration to be imported into the ALREADY-CREATED
-- db_myacademia database (does not CREATE/DROP the database itself,
-- and does not touch any existing table).
--
-- Source: first sheet ("MoU Master Database") of Sample_MoU_Database.xlsx
-- Columns mapped:
--   No.                        -> mou_agreements.sn
--   Partner Organization       -> mou_agreements.partner_id (FK -> existing partner_organisations)
--   Partner Type               -> mou_agreements.partner_type_id (FK -> new partner_types lookup)
--   Country                    -> mou_agreements.country
--   Contact Person/Position/
--   Email/Phone                -> mou_agreements.contact_* (snapshot at time of signing)
--   Date Signed                -> mou_agreements.date_signed
--   Effective Date             -> mou_agreements.effective_date
--   Expiry Date                -> mou_agreements.expiry_date
--   Duration                   -> mou_agreements.duration_label (free text, e.g. "3 Years")
--                                  + duration_months (GENERATED from effective/expiry dates)
--   Purpose/Objectives         -> mou_agreements.purpose_objectives
--   Area(s) of Collaboration   -> new collaboration_areas lookup + mou_collaboration_links (M2M,
--                                  since the sheet stores multiple semicolon-separated values,
--                                  e.g. "Internship; Research; Staff Exchange")
--   Responsible Department     -> mou_agreements.responsible_department_id (FK -> existing departments)
--   Institutional Focal Person -> mou_agreements.institutional_focal_person_id (FK -> existing staff)
--   Status                     -> mou_agreements.status (ENUM)
--   Renewal Required           -> mou_agreements.renewal_required (boolean)
--   Last Review Date           -> mou_agreements.last_review_date
--   Key Deliverables           -> mou_agreements.key_deliverables
--   Progress Status            -> mou_agreements.progress_status (ENUM)
--   Next Action                -> mou_agreements.next_action
--   Remarks                    -> mou_agreements.remarks
--
-- Run against the existing database, e.g.:
--   mysql -u root -p db_myacademia < database/mou_schema.sql
-- =====================================================================

-- (no USE statement: run it against the database you selected, e.g. npm run db:init-mou)

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 1. LOOKUP TABLES
-- =====================================================================

CREATE TABLE partner_types (
    partner_type_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type_name       VARCHAR(100) NOT NULL,  -- Private Company, Government Institution, NGO, University ...
    UNIQUE KEY uq_partner_type_name (type_name)
) ENGINE=InnoDB;

CREATE TABLE collaboration_areas (
    collaboration_area_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    area_name              VARCHAR(150) NOT NULL,  -- Internship, Research, Staff Exchange ...
    UNIQUE KEY uq_collaboration_area_name (area_name)
) ENGINE=InnoDB;

-- =====================================================================
-- 2. MoU MASTER REGISTRY
-- =====================================================================

CREATE TABLE mou_agreements (
    mou_id                       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sn                           INT UNSIGNED NULL,          -- original "No." from sheet, kept for traceability

    partner_id                   INT UNSIGNED NOT NULL,      -- reuses existing partner_organisations table
    partner_type_id              INT UNSIGNED NULL,
    country                      VARCHAR(100) NULL,

    contact_person               VARCHAR(150) NULL,          -- snapshot of the partner's signatory/contact
    contact_position              VARCHAR(150) NULL,
    contact_email                 VARCHAR(150) NULL,
    contact_phone                 VARCHAR(30)  NULL,

    date_signed                  DATE NULL,
    effective_date                DATE NULL,
    expiry_date                   DATE NULL,
    duration_label                 VARCHAR(50) NULL,          -- free-text as captured on the sheet, e.g. "3 Years"
    duration_months                SMALLINT UNSIGNED
        GENERATED ALWAYS AS (TIMESTAMPDIFF(MONTH, effective_date, expiry_date)) STORED,

    purpose_objectives             TEXT NULL,

    responsible_department_id      INT UNSIGNED NULL,         -- reuses existing departments table
    institutional_focal_person_id  INT UNSIGNED NULL,         -- reuses existing staff table

    status                        ENUM('Active','Expired','Terminated','Under Review','Pending Signature')
                                       NOT NULL DEFAULT 'Active',
    renewal_required               TINYINT(1) NOT NULL DEFAULT 0,
    last_review_date               DATE NULL,
    key_deliverables               TEXT NULL,
    progress_status               ENUM('On Track','Delayed','At Risk','Completed','Not Started') NULL,
    next_action                    VARCHAR(255) NULL,
    remarks                       TEXT NULL,

    academic_year_id               INT UNSIGNED NULL,         -- reuses existing academic_years table
    created_by                    INT UNSIGNED NULL,          -- reuses existing users table
    created_at                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_mou_partner
        FOREIGN KEY (partner_id) REFERENCES partner_organisations(partner_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_mou_partner_type
        FOREIGN KEY (partner_type_id) REFERENCES partner_types(partner_type_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_mou_department
        FOREIGN KEY (responsible_department_id) REFERENCES departments(department_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_mou_focal_person
        FOREIGN KEY (institutional_focal_person_id) REFERENCES staff(staff_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_mou_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(academic_year_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_mou_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_mou_expiry_after_effective
        CHECK (expiry_date IS NULL OR effective_date IS NULL OR expiry_date >= effective_date),

    INDEX idx_mou_partner (partner_id),
    INDEX idx_mou_status (status),
    INDEX idx_mou_department (responsible_department_id),
    INDEX idx_mou_expiry (expiry_date)
) ENGINE=InnoDB;

-- =====================================================================
-- 3. MoU <-> COLLABORATION AREAS (many-to-many, mirrors project_departments)
-- =====================================================================

CREATE TABLE mou_collaboration_links (
    mou_id                 INT UNSIGNED NOT NULL,
    collaboration_area_id  INT UNSIGNED NOT NULL,
    PRIMARY KEY (mou_id, collaboration_area_id),
    CONSTRAINT fk_mou_collab_mou
        FOREIGN KEY (mou_id) REFERENCES mou_agreements(mou_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_mou_collab_area
        FOREIGN KEY (collaboration_area_id) REFERENCES collaboration_areas(collaboration_area_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 4. SEED DATA — lookup values observed in the sample sheet
-- =====================================================================

INSERT INTO partner_types (type_name) VALUES
    ('Private Company'),
    ('Government Institution'),
    ('NGO'),
    ('University'),
    ('Development Partner'),
    ('International Organization')
ON DUPLICATE KEY UPDATE type_name = VALUES(type_name);

INSERT INTO collaboration_areas (area_name) VALUES
    ('Internship'),
    ('Research'),
    ('Staff Exchange'),
    ('Curriculum Development'),
    ('Student Exchange'),
    ('Joint Training'),
    ('Resource Mobilization'),
    ('Technology Transfer')
ON DUPLICATE KEY UPDATE area_name = VALUES(area_name);

-- =====================================================================
-- 5. REPORTING VIEW (mirrors the style of v_projects_full / v_short_courses_full)
-- =====================================================================

CREATE OR REPLACE VIEW v_mou_agreements_full AS
SELECT
    m.mou_id,
    m.sn,
    po.partner_name,
    pt.type_name                    AS partner_type,
    m.country,
    m.contact_person,
    m.contact_position,
    m.contact_email,
    m.contact_phone,
    m.date_signed,
    m.effective_date,
    m.expiry_date,
    m.duration_label,
    m.duration_months,
    m.purpose_objectives,
    d.department_name               AS responsible_department,
    s.full_name                     AS institutional_focal_person,
    m.status,
    m.renewal_required,
    m.last_review_date,
    m.key_deliverables,
    m.progress_status,
    m.next_action,
    m.remarks,
    ay.year_label                    AS academic_year,
    m.created_at,
    m.updated_at
FROM mou_agreements m
LEFT JOIN partner_organisations po ON po.partner_id = m.partner_id
LEFT JOIN partner_types pt ON pt.partner_type_id = m.partner_type_id
LEFT JOIN departments d ON d.department_id = m.responsible_department_id
LEFT JOIN staff s ON s.staff_id = m.institutional_focal_person_id
LEFT JOIN academic_years ay ON ay.academic_year_id = m.academic_year_id;

-- =====================================================================
-- END OF MoU SCHEMA ADD-ON
-- =====================================================================
