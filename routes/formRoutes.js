const express = require('express');
const controller = require('../controllers/formController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { idParamValidator } = require('./validators/genericValidator');
const ROLES = require('../utils/roles');

const router = express.Router();

// Responses hold applicants' personal details, so the whole module is limited to these roles.
const readRoles = [ROLES.PRINCIPAL, ROLES.CDSM, ROLES.ADMINISTRATOR];
const writeRoles = [ROLES.CDSM, ROLES.ADMINISTRATOR];
const read = [authenticate, authorize(...readRoles)];
const write = [authenticate, authorize(...writeRoles)];
const id = [idParamValidator(), validate];

router.get('/templates', ...read, controller.templates);
router.get('/', ...read, controller.list);
router.post('/', ...write, controller.create);

router.get('/:id', ...read, ...id, controller.getOne);
router.put('/:id', ...write, ...id, controller.update);
router.delete('/:id', ...write, ...id, controller.remove);

router.post('/:id/publish', ...write, ...id, controller.publish);
router.post('/:id/close', ...write, ...id, controller.close);
router.post('/:id/unpublish', ...write, ...id, controller.unpublish);

router.get('/:id/responses', ...read, ...id, controller.responses);
router.delete('/:id/responses/:responseId', ...write, ...id, idParamValidator('responseId'), validate, controller.removeResponse);

module.exports = router;
