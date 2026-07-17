const express = require('express');
const { body } = require('express-validator');
const entities = require('../models/entities');
const controller = require('../controllers/projectController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  buildCreateValidators,
  buildUpdateValidators,
  idParamValidator,
} = require('./validators/genericValidator');
const ROLES = require('../utils/roles');

const entity = entities.projects;
const router = express.Router();

const writeRoles = [ROLES.PRINCIPAL, ROLES.HOD, ROLES.CDSM, ROLES.ADMINISTRATOR];

router.get('/summary', authenticate, controller.summary);
router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, idParamValidator(), validate, controller.getOne);
router.get('/:id/full', authenticate, idParamValidator(), validate, controller.getFull);

router.post('/', authenticate, authorize(...writeRoles), buildCreateValidators(entity), validate, controller.create);
router.put(
  '/:id',
  authenticate,
  authorize(...writeRoles),
  idParamValidator(),
  buildUpdateValidators(entity),
  validate,
  controller.update
);
router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.PRINCIPAL, ROLES.CDSM, ROLES.ADMINISTRATOR),
  idParamValidator(),
  validate,
  controller.remove
);

// ---- Target departments (many-to-many) ----
router.get('/:id/departments', authenticate, idParamValidator(), validate, controller.listDepartments);
router.post(
  '/:id/departments',
  authenticate,
  authorize(...writeRoles),
  idParamValidator(),
  body('department_id').isInt({ min: 1 }).withMessage('department_id must be a positive integer').toInt(),
  validate,
  controller.addDepartment
);
router.delete(
  '/:id/departments/:departmentId',
  authenticate,
  authorize(...writeRoles),
  idParamValidator(),
  idParamValidator('departmentId'),
  validate,
  controller.removeDepartment
);

// ---- Partner organisations (many-to-many) ----
router.get('/:id/partners', authenticate, idParamValidator(), validate, controller.listPartners);
router.post(
  '/:id/partners',
  authenticate,
  authorize(...writeRoles),
  idParamValidator(),
  body('partner_id').isInt({ min: 1 }).withMessage('partner_id must be a positive integer').toInt(),
  validate,
  controller.addPartner
);
router.delete(
  '/:id/partners/:partnerId',
  authenticate,
  authorize(...writeRoles),
  idParamValidator(),
  idParamValidator('partnerId'),
  validate,
  controller.removePartner
);

module.exports = router;
