const express = require('express');
const entities = require('../models/entities');
const controller = require('../controllers/shortCourseController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  buildCreateValidators,
  buildUpdateValidators,
  idParamValidator,
} = require('./validators/genericValidator');
const ROLES = require('../utils/roles');

const entity = entities.short_courses;
const router = express.Router();

const writeRoles = [ROLES.PRINCIPAL, ROLES.HOD, ROLES.CDSM, ROLES.COORDINATOR, ROLES.ADMINISTRATOR];

router.get('/summary', authenticate, controller.summary);
router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, idParamValidator(), validate, controller.getOne);

router.post(
  '/',
  authenticate,
  authorize(...writeRoles),
  buildCreateValidators(entity),
  validate,
  controller.create
);

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

module.exports = router;
