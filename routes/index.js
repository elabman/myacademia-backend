const express = require('express');
const entities = require('../models/entities');
const buildEntityRouter = require('./entityRouter');
const ROLES = require('../utils/roles');

const authRoutes = require('./authRoutes');
const shortCourseRoutes = require('./shortCourseRoutes');
const projectRoutes = require('./projectRoutes');
const uploadRoutes = require('./uploadRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/short-courses', shortCourseRoutes);
router.use('/projects', projectRoutes);
router.use('/uploads', uploadRoutes);

// ---------------------------------------------------------------
// Lookup / reference tables - writable by Administrator & CDSM only
// ---------------------------------------------------------------
const lookupWriteRoles = [ROLES.ADMINISTRATOR, ROLES.CDSM];
const lookupTables = [
  'departments', 'academic_years', 'course_categories', 'delivery_modes',
  'certification_types', 'accreditation_bodies', 'donors',
  'partner_organisations', 'funding_types', 'sectors', 'beneficiary_types',
  'roles',
];
lookupTables.forEach((name) => {
  router.use(
    `/${name.replace(/_/g, '-')}`,
    buildEntityRouter(entities[name], { writeRoles: lookupWriteRoles })
  );
});

// ---------------------------------------------------------------
// Access control tables
// ---------------------------------------------------------------
router.use(
  '/users',
  buildEntityRouter(entities.users, { writeRoles: [ROLES.ADMINISTRATOR], audited: true })
);
router.use(
  '/staff',
  buildEntityRouter(entities.staff, {
    writeRoles: [ROLES.ADMINISTRATOR, ROLES.CDSM, ROLES.HOD],
  })
);

// ---------------------------------------------------------------
// M2M link tables exposed directly too (in addition to the nested
// /projects/:id/departments and /projects/:id/partners routes)
// ---------------------------------------------------------------
router.use(
  '/project-departments',
  buildEntityRouter(entities.project_departments, {
    writeRoles: [ROLES.PRINCIPAL, ROLES.HOD, ROLES.CDSM, ROLES.ADMINISTRATOR],
  })
);
router.use(
  '/project-partners',
  buildEntityRouter(entities.project_partners, {
    writeRoles: [ROLES.PRINCIPAL, ROLES.HOD, ROLES.CDSM, ROLES.ADMINISTRATOR],
  })
);

// ---------------------------------------------------------------
// Approval workflow
// ---------------------------------------------------------------
router.use(
  '/approvals',
  buildEntityRouter(entities.approvals, {
    writeRoles: [ROLES.PRINCIPAL, ROLES.DIRECTOR_OF_PLANNING, ROLES.HOD, ROLES.CDSM, ROLES.ADMINISTRATOR],
    audited: true,
  })
);

router.use(
  'roles',
  buildEntityRouter(entities.roles, {
    writeRoles:[ROLES.ADMINISTRATOR, ROLES.PRINCIPAL],
  })
)
// ---------------------------------------------------------------
// Audit log - read only, written internally by other controllers
// ---------------------------------------------------------------
router.use('/audit-log', buildEntityRouter(entities.audit_log, { readOnly: true }));

module.exports = router;
