const express = require('express');
const { body } = require('express-validator');
const entities = require('../models/entities');
const controller = require('../controllers/mouController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  buildCreateValidators,
  buildUpdateValidators,
  idParamValidator,
} = require('./validators/genericValidator');
const ROLES = require('../utils/roles');

const entity = entities.mou_agreements;
const router = express.Router();

const writeRoles = [ROLES.PRINCIPAL, ROLES.HOD, ROLES.CDSM, ROLES.ADMINISTRATOR];

router.get('/summary', authenticate, controller.summary);
router.get('/expiring', authenticate, controller.expiring);
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

// ---- Collaboration areas (many-to-many) ----
router.get('/:id/collaboration-areas', authenticate, idParamValidator(), validate, controller.listCollaborationAreas);
router.post(
  '/:id/collaboration-areas',
  authenticate,
  authorize(...writeRoles),
  idParamValidator(),
  body('collaboration_area_id').isInt({ min: 1 }).withMessage('collaboration_area_id must be a positive integer').toInt(),
  validate,
  controller.addCollaborationArea
);
router.delete(
  '/:id/collaboration-areas/:areaId',
  authenticate,
  authorize(...writeRoles),
  idParamValidator(),
  idParamValidator('areaId'),
  validate,
  controller.removeCollaborationArea
);

module.exports = router;
