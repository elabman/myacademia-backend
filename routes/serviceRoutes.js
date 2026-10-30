const express = require('express');
const { body } = require('express-validator');
const entities = require('../models/entities');
const controller = require('../controllers/serviceController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  buildCreateValidators,
  buildUpdateValidators,
  idParamValidator,
} = require('./validators/genericValidator');
const ROLES = require('../utils/roles');

const entity = entities.services;
const router = express.Router();

const writeRoles = [ROLES.ADMINISTRATOR, ROLES.CDSM, ROLES.HOD];

// A service is offered by many departments: send department_ids to (re)place its links.
const departmentIdsValidators = [
  body('department_ids').optional({ nullable: true }).isArray().withMessage('department_ids must be an array'),
  body('department_ids.*').isInt({ min: 1 }).withMessage('department_ids must contain positive integers').toInt(),
];

router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, idParamValidator(), validate, controller.getOne);

router.post(
  '/',
  authenticate,
  authorize(...writeRoles),
  buildCreateValidators(entity),
  departmentIdsValidators,
  validate,
  controller.create
);
router.put(
  '/:id',
  authenticate,
  authorize(...writeRoles),
  idParamValidator(),
  buildUpdateValidators(entity),
  departmentIdsValidators,
  validate,
  controller.update
);
router.delete(
  '/:id',
  authenticate,
  authorize(...writeRoles),
  idParamValidator(),
  validate,
  controller.remove
);

module.exports = router;
