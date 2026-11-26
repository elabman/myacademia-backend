-- =====================================================================
-- db_myacademia — PUBLIC REVIEWS ADD-ON
-- =====================================================================
-- Standalone, re-runnable migration for the ALREADY-CREATED database
-- (does not CREATE/DROP the database and does not touch other tables).
--
--   npm run db:init-reviews
--
-- Flow: a Data Matrix on each staff member's office card opens the
-- public review page; the visitor picks a service offered by that
-- staff member's department, an emoji rating (1-5) and optionally
-- leaves a comment.
--
--   services            reviewable services (e.g. "Transcript Request")
--   service_departments many-to-many: one service can be offered by
--                       several departments
--   reviews             submitted public feedback
-- =====================================================================

CREATE TABLE IF NOT EXISTS services (
    service_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    description TEXT         NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_service_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_departments (
    service_id    INT UNSIGNED NOT NULL,
    department_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (service_id, department_id),
    CONSTRAINT fk_sd_service
        FOREIGN KEY (service_id) REFERENCES services(service_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_sd_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Rating scale (the frontend owns the emoji + label):
--   1 Very Poor, 2 Poor, 3 Okay, 4 Good, 5 Excellent
CREATE TABLE IF NOT EXISTS reviews (
    review_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id      INT UNSIGNED NOT NULL,
    service_id    INT UNSIGNED NOT NULL,
    rating        TINYINT UNSIGNED NOT NULL,
    comment       TEXT         NULL,
    reviewer_name VARCHAR(100) NULL,
    client_hash   CHAR(64)     NULL,           -- sha256 of the submitter's IP, never exposed by the API
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_review_staff
        FOREIGN KEY (staff_id) REFERENCES staff(staff_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    -- RESTRICT: a service that already has reviews cannot be deleted (API returns 409)
    CONSTRAINT fk_review_service
        FOREIGN KEY (service_id) REFERENCES services(service_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    KEY idx_reviews_staff (staff_id),
    KEY idx_reviews_service (service_id),
    KEY idx_reviews_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS review_notification_settings (
    id              TINYINT UNSIGNED PRIMARY KEY,
    recipient_email VARCHAR(254) NOT NULL DEFAULT '',
    enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_review_notification_singleton CHECK (id = 1),
    CONSTRAINT chk_review_notification_recipient CHECK (enabled = FALSE OR recipient_email <> '')
) ENGINE=InnoDB;
