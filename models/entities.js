/**
 * =====================================================================
 * ENTITY REGISTRY
 * =====================================================================
 * Single source of truth describing every table in db_myacademia.
 * The generic repository/controller/router/validator factories all
 * read from this file, so adding a table only requires adding an
 * entry here instead of duplicating controller/route code.
 *
 * Fields:
 *  table        - DB table name
 *  pk           - primary key column
 *  fillable     - columns accepted on create/update from the request body
 *  required     - subset of fillable required on create
 *  foreignKeys  - [{ field, refTable, refPk, allowNull }] validated
 *                 before insert/update to prevent orphan records
 *  unique       - columns that must be unique (checked -> 409 Conflict)
 *  searchable   - columns eligible for ?search=
 *  filterable   - columns eligible for exact-match / range filtering
 *  sortable     - columns eligible for ?sort=
 *  joins        - LEFT JOINs used to enrich list/detail responses
 *  enum         - { column: [allowed values] } for validation
 * =====================================================================
 */

const entities = {
  // ---------------------------------------------------------------
  // Lookup / reference tables
  // ---------------------------------------------------------------
  departments: {
    table: 'departments',
    pk: 'department_id',
    fillable: ['department_name', 'department_code', 'is_active'],
    required: ['department_name'],
    unique: ['department_name'],
    searchable: ['department_name', 'department_code'],
    filterable: ['is_active'],
    sortable: ['department_id', 'department_name', 'created_at'],
  },

  academic_years: {
    table: 'academic_years',
    pk: 'academic_year_id',
    fillable: ['year_label', 'start_date', 'end_date'],
    required: ['year_label'],
    unique: ['year_label'],
    searchable: ['year_label'],
    filterable: [],
    sortable: ['academic_year_id', 'year_label', 'start_date'],
  },

  course_categories: {
    table: 'course_categories',
    pk: 'category_id',
    fillable: ['category_name'],
    required: ['category_name'],
    unique: ['category_name'],
    searchable: ['category_name'],
    filterable: [],
    sortable: ['category_id', 'category_name'],
  },

  delivery_modes: {
    table: 'delivery_modes',
    pk: 'delivery_mode_id',
    fillable: ['mode_name'],
    required: ['mode_name'],
    unique: ['mode_name'],
    searchable: ['mode_name'],
    filterable: [],
    sortable: ['delivery_mode_id', 'mode_name'],
  },

  certification_types: {
    table: 'certification_types',
    pk: 'certification_id',
    fillable: ['certification_name'],
    required: ['certification_name'],
    unique: ['certification_name'],
    searchable: ['certification_name'],
    filterable: [],
    sortable: ['certification_id', 'certification_name'],
  },

  accreditation_bodies: {
    table: 'accreditation_bodies',
    pk: 'accreditation_body_id',
    fillable: ['body_name'],
    required: ['body_name'],
    unique: ['body_name'],
    searchable: ['body_name'],
    filterable: [],
    sortable: ['accreditation_body_id', 'body_name'],
  },

  donors: {
    table: 'donors',
    pk: 'donor_id',
    fillable: ['donor_name'],
    required: ['donor_name'],
    unique: ['donor_name'],
    searchable: ['donor_name'],
    filterable: [],
    sortable: ['donor_id', 'donor_name'],
  },

  partner_organisations: {
    table: 'partner_organisations',
    pk: 'partner_id',
    fillable: ['partner_name'],
    required: ['partner_name'],
    unique: ['partner_name'],
    searchable: ['partner_name'],
    filterable: [],
    sortable: ['partner_id', 'partner_name'],
  },

  funding_types: {
    table: 'funding_types',
    pk: 'funding_type_id',
    fillable: ['type_name'],
    required: ['type_name'],
    unique: ['type_name'],
    searchable: ['type_name'],
    filterable: [],
    sortable: ['funding_type_id', 'type_name'],
  },

  sectors: {
    table: 'sectors',
    pk: 'sector_id',
    fillable: ['sector_name'],
    required: ['sector_name'],
    unique: ['sector_name'],
    searchable: ['sector_name'],
    filterable: [],
    sortable: ['sector_id', 'sector_name'],
  },

  beneficiary_types: {
    table: 'beneficiary_types',
    pk: 'beneficiary_type_id',
    fillable: ['type_name'],
    required: ['type_name'],
    unique: ['type_name'],
    searchable: ['type_name'],
    filterable: [],
    sortable: ['beneficiary_type_id', 'type_name'],
  },

  roles: {
    table: 'roles',
    pk: 'role_id',
    fillable: ['role_name', 'description'],
    required: ['role_name'],
    unique: ['role_name'],
    searchable: ['role_name', 'description'],
    filterable: [],
    sortable: ['role_id', 'role_name'],
  },

  // ---------------------------------------------------------------
  // Access control
  // ---------------------------------------------------------------
  users: {
    table: 'users',
    pk: 'user_id',
    // password_hash is deliberately excluded - never set via generic CRUD
    fillable: ['full_name', 'email', 'role_id', 'department_id', 'phone', 'is_active'],
    required: ['full_name', 'email', 'role_id'],
    unique: ['email'],
    foreignKeys: [
      { field: 'role_id', refTable: 'roles', refPk: 'role_id', allowNull: false },
      { field: 'department_id', refTable: 'departments', refPk: 'department_id', allowNull: true },
    ],
    searchable: ['full_name', 'email', 'phone'],
    filterable: ['role_id', 'department_id', 'is_active'],
    sortable: ['user_id', 'full_name', 'email', 'created_at', 'last_login_at'],
    joins: [
      { table: 'roles', alias: 'r', on: 'r.role_id = t.role_id', select: 'r.role_name' },
      { table: 'departments', alias: 'd', on: 'd.department_id = t.department_id', select: 'd.department_name' },
    ],
    sensitive: ['password_hash'],
  },

  staff: {
    table: 'staff',
    pk: 'staff_id',
    fillable: ['full_name', 'email', 'phone', 'department_id', 'user_id', 'is_active'],
    required: ['full_name'],
    foreignKeys: [
      { field: 'department_id', refTable: 'departments', refPk: 'department_id', allowNull: true },
      { field: 'user_id', refTable: 'users', refPk: 'user_id', allowNull: true },
    ],
    searchable: ['full_name', 'email', 'phone'],
    filterable: ['department_id', 'is_active'],
    sortable: ['staff_id', 'full_name'],
    joins: [
      { table: 'departments', alias: 'd', on: 'd.department_id = t.department_id', select: 'd.department_name' },
    ],
  },

  // ---------------------------------------------------------------
  // Short courses registry
  // ---------------------------------------------------------------
  short_courses: {
    table: 'short_courses',
    pk: 'course_id',
    fillable: [
      'sn', 'course_title', 'department_id', 'category_id', 'duration_days', 'duration_hours',
      'level', 'delivery_mode_id', 'language', 'target_audience', 'prerequisites',
      'coordinator_id', 'certification_id', 'accreditation_body_id',
      'participants_female', 'participants_male', 'total_certified',
      'fee_per_participant', 'status', 'academic_year_id', 'created_by',
    ],
    required: ['course_title', 'department_id'],
    enum: {
      level: ['Beginner', 'Intermediate', 'Advanced'],
      status: ['Planning', 'Active', 'Completed', 'Cancelled'],
    },
    foreignKeys: [
      { field: 'department_id', refTable: 'departments', refPk: 'department_id', allowNull: false },
      { field: 'category_id', refTable: 'course_categories', refPk: 'category_id', allowNull: true },
      { field: 'delivery_mode_id', refTable: 'delivery_modes', refPk: 'delivery_mode_id', allowNull: true },
      { field: 'coordinator_id', refTable: 'staff', refPk: 'staff_id', allowNull: true },
      { field: 'certification_id', refTable: 'certification_types', refPk: 'certification_id', allowNull: true },
      { field: 'accreditation_body_id', refTable: 'accreditation_bodies', refPk: 'accreditation_body_id', allowNull: true },
      { field: 'academic_year_id', refTable: 'academic_years', refPk: 'academic_year_id', allowNull: true },
      { field: 'created_by', refTable: 'users', refPk: 'user_id', allowNull: true },
    ],
    searchable: ['course_title', 'language', 'target_audience'],
    filterable: ['department_id', 'category_id', 'status', 'academic_year_id', 'level'],
    sortable: ['course_id', 'course_title', 'total_participants', 'expected_revenue', 'created_at'],
    joins: [
      { table: 'departments', alias: 'd', on: 'd.department_id = t.department_id', select: 'd.department_name' },
      { table: 'course_categories', alias: 'cc', on: 'cc.category_id = t.category_id', select: 'cc.category_name' },
      { table: 'delivery_modes', alias: 'dm', on: 'dm.delivery_mode_id = t.delivery_mode_id', select: 'dm.mode_name AS delivery_mode' },
      { table: 'staff', alias: 'st', on: 'st.staff_id = t.coordinator_id', select: 'st.full_name AS coordinator_name' },
      { table: 'certification_types', alias: 'ct', on: 'ct.certification_id = t.certification_id', select: 'ct.certification_name' },
      { table: 'accreditation_bodies', alias: 'ab', on: 'ab.accreditation_body_id = t.accreditation_body_id', select: 'ab.body_name AS accreditation_body' },
      { table: 'academic_years', alias: 'ay', on: 'ay.academic_year_id = t.academic_year_id', select: 'ay.year_label AS academic_year' },
    ],
    // generated columns - never write, always readable
    generated: ['total_participants', 'expected_revenue'],
    checks: [
      { message: 'total_certified cannot exceed total_participants (participants_female + participants_male)' },
    ],
  },

  // ---------------------------------------------------------------
  // Partner / donor projects registry
  // ---------------------------------------------------------------
  projects: {
    table: 'projects',
    pk: 'project_id',
    fillable: [
      'sn', 'project_title', 'donor_id', 'funding_type_id', 'sector_id', 'project_coordinator_id',
      'start_date', 'end_date', 'total_budget_usd', 'total_budget_rwf', 'college_contribution_rwf',
      'donor_contribution_usd', 'geographic_scope', 'beneficiary_type_id', 'no_direct_beneficiaries',
      'key_performance_indicator', 'achievement_rate_pct', 'remarks', 'overall_status',
      'academic_year_id', 'created_by',
    ],
    required: ['project_title'],
    enum: {
      overall_status: ['Pipeline', 'Active', 'Completed', 'Suspended', 'Cancelled'],
    },
    foreignKeys: [
      { field: 'donor_id', refTable: 'donors', refPk: 'donor_id', allowNull: true },
      { field: 'funding_type_id', refTable: 'funding_types', refPk: 'funding_type_id', allowNull: true },
      { field: 'sector_id', refTable: 'sectors', refPk: 'sector_id', allowNull: true },
      { field: 'project_coordinator_id', refTable: 'staff', refPk: 'staff_id', allowNull: true },
      { field: 'beneficiary_type_id', refTable: 'beneficiary_types', refPk: 'beneficiary_type_id', allowNull: true },
      { field: 'academic_year_id', refTable: 'academic_years', refPk: 'academic_year_id', allowNull: true },
      { field: 'created_by', refTable: 'users', refPk: 'user_id', allowNull: true },
    ],
    searchable: ['project_title', 'geographic_scope', 'key_performance_indicator'],
    filterable: ['donor_id', 'sector_id', 'overall_status', 'academic_year_id'],
    sortable: ['project_id', 'project_title', 'start_date', 'end_date', 'total_budget_usd', 'created_at'],
    joins: [
      { table: 'donors', alias: 'dn', on: 'dn.donor_id = t.donor_id', select: 'dn.donor_name' },
      { table: 'funding_types', alias: 'ft', on: 'ft.funding_type_id = t.funding_type_id', select: 'ft.type_name AS funding_type' },
      { table: 'sectors', alias: 'sec', on: 'sec.sector_id = t.sector_id', select: 'sec.sector_name' },
      { table: 'staff', alias: 'st', on: 'st.staff_id = t.project_coordinator_id', select: 'st.full_name AS coordinator_name' },
      { table: 'beneficiary_types', alias: 'bt', on: 'bt.beneficiary_type_id = t.beneficiary_type_id', select: 'bt.type_name AS beneficiary_type' },
      { table: 'academic_years', alias: 'ay', on: 'ay.academic_year_id = t.academic_year_id', select: 'ay.year_label AS academic_year' },
    ],
    generated: ['duration_months'],
    checks: [
      { message: 'end_date must be on/after start_date' },
    ],
  },

  // M2M linking tables (multi-valued fields in the source sheets)
  project_departments: {
    table: 'project_departments',
    pk: null, // composite key (project_id, department_id) - handled specially
    compositeKey: ['project_id', 'department_id'],
    fillable: ['project_id', 'department_id'],
    required: ['project_id', 'department_id'],
    foreignKeys: [
      { field: 'project_id', refTable: 'projects', refPk: 'project_id', allowNull: false },
      { field: 'department_id', refTable: 'departments', refPk: 'department_id', allowNull: false },
    ],
    searchable: [],
    filterable: ['project_id', 'department_id'],
    sortable: ['project_id', 'department_id'],
  },

  project_partners: {
    table: 'project_partners',
    pk: null,
    compositeKey: ['project_id', 'partner_id'],
    fillable: ['project_id', 'partner_id'],
    required: ['project_id', 'partner_id'],
    foreignKeys: [
      { field: 'project_id', refTable: 'projects', refPk: 'project_id', allowNull: false },
      { field: 'partner_id', refTable: 'partner_organisations', refPk: 'partner_id', allowNull: false },
    ],
    searchable: [],
    filterable: ['project_id', 'partner_id'],
    sortable: ['project_id', 'partner_id'],
  },

  // ---------------------------------------------------------------
  // Approval workflow & audit
  // ---------------------------------------------------------------
  approvals: {
    table: 'approvals',
    pk: 'approval_id',
    fillable: [
      'entity_type', 'entity_id', 'requested_by', 'role_required',
      'reviewer_id', 'decision', 'comments', 'decision_date',
    ],
    required: ['entity_type', 'entity_id', 'requested_by', 'role_required'],
    enum: {
      entity_type: ['short_course', 'project'],
      decision: ['Pending', 'Approved', 'Rejected', 'Returned'],
    },
    foreignKeys: [
      { field: 'requested_by', refTable: 'users', refPk: 'user_id', allowNull: false },
      { field: 'role_required', refTable: 'roles', refPk: 'role_id', allowNull: false },
      { field: 'reviewer_id', refTable: 'users', refPk: 'user_id', allowNull: true },
    ],
    searchable: ['comments'],
    filterable: ['entity_type', 'entity_id', 'decision', 'role_required'],
    sortable: ['approval_id', 'created_at', 'decision_date'],
    joins: [
      { table: 'roles', alias: 'r', on: 'r.role_id = t.role_required', select: 'r.role_name AS role_required_name' },
      { table: 'users', alias: 'ru', on: 'ru.user_id = t.requested_by', select: 'ru.full_name AS requested_by_name' },
    ],
  },

  audit_log: {
    table: 'audit_log',
    pk: 'log_id',
    fillable: ['user_id', 'table_name', 'record_id', 'action', 'old_values', 'new_values'],
    required: ['table_name', 'record_id', 'action'],
    enum: { action: ['INSERT', 'UPDATE', 'DELETE'] },
    foreignKeys: [
      { field: 'user_id', refTable: 'users', refPk: 'user_id', allowNull: true },
    ],
    searchable: ['table_name'],
    filterable: ['table_name', 'record_id', 'action', 'user_id'],
    sortable: ['log_id', 'action_at'],
    readOnly: true, // written internally only, never via public create/update/delete
  },
};

module.exports = entities;
