-- =====================================================================
-- db_myacademia — DYNAMIC FORMS ADD-ON (admin-built application forms)
-- =====================================================================
-- Re-runnable migration for the ALREADY-CREATED database:
--
--   npm run db:init-forms
--
-- Each form belongs to ONE short course (internal tool: it is managed from the
-- short course screen, and only the applicant link is public).
-- An administrator builds a form (sections + questions of different types),
-- publishes it, optionally sets when it opens and expires, and shares the
-- public link. Applicants fill it in without logging in; answers are stored
-- and the administrator reviews/exports them.
--
--   forms           the form itself: status, open/expiry window, settings
--   form_sections   ordered sections of a form
--   form_questions  ordered questions (type, required, options)
--   form_responses  one row per submitted application
--   form_answers    one row per answered question of a response
--
-- opens_at / closes_at are stored in UTC and compared with UTC_TIMESTAMP().
-- =====================================================================

CREATE TABLE IF NOT EXISTS forms (
    form_id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    short_course_id      INT UNSIGNED NULL,               -- the short course this form takes applications for
    title                VARCHAR(200) NOT NULL,
    slug                 VARCHAR(120) NOT NULL,           -- public link: /apply/<slug>
    description          TEXT         NULL,
    application_type     VARCHAR(100) NULL,               -- e.g. "Training application"
    status               ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
    opens_at             DATETIME     NULL,               -- UTC; NULL = opens as soon as published
    closes_at            DATETIME     NULL,               -- UTC; NULL = never expires
    limit_one_per_email  TINYINT(1)   NOT NULL DEFAULT 1,
    confirmation_message TEXT         NULL,               -- shown after a successful submission
    published_at         DATETIME     NULL,
    created_by           INT UNSIGNED NULL,
    created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_form_slug (slug),
    UNIQUE KEY uq_form_short_course (short_course_id),   -- one application form per short course
    CONSTRAINT fk_form_short_course
        FOREIGN KEY (short_course_id) REFERENCES short_courses(course_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_form_creator
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS form_sections (
    section_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    form_id     INT UNSIGNED NOT NULL,
    title       VARCHAR(200) NOT NULL,
    description TEXT         NULL,
    position    INT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT fk_section_form
        FOREIGN KEY (form_id) REFERENCES forms(form_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    KEY idx_section_form (form_id, position)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS form_questions (
    question_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    form_id       INT UNSIGNED NOT NULL,
    section_id    INT UNSIGNED NOT NULL,
    label         VARCHAR(500) NOT NULL,
    help_text     TEXT         NULL,
    question_type ENUM('short_text','paragraph','multiple_choice','checkboxes','dropdown',
                       'yes_no','email','phone','number','date','consent') NOT NULL,
    is_required   TINYINT(1)   NOT NULL DEFAULT 0,
    options       JSON         NULL,                      -- list of choices for the choice types
    position      INT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT fk_question_form
        FOREIGN KEY (form_id) REFERENCES forms(form_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_question_section
        FOREIGN KEY (section_id) REFERENCES form_sections(section_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    KEY idx_question_section (section_id, position)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS form_responses (
    response_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    form_id          INT UNSIGNED NOT NULL,
    respondent_email VARCHAR(190) NULL,                   -- from the form's email question, lower-cased
    client_hash      CHAR(64)     NULL,                   -- sha256 of the submitter's IP, never exposed
    submitted_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_response_form
        FOREIGN KEY (form_id) REFERENCES forms(form_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    -- one application per email address (NULL emails are not compared)
    UNIQUE KEY uq_form_email (form_id, respondent_email),
    KEY idx_response_submitted (form_id, submitted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS form_answers (
    answer_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    response_id INT UNSIGNED NOT NULL,
    question_id INT UNSIGNED NOT NULL,
    value       TEXT         NULL,                        -- checkboxes are stored as a JSON array
    CONSTRAINT fk_answer_response
        FOREIGN KEY (response_id) REFERENCES form_responses(response_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_answer_question
        FOREIGN KEY (question_id) REFERENCES form_questions(question_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_answer (response_id, question_id)
) ENGINE=InnoDB;
