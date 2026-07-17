const express = require('express');
const createCrudController = require('../controllers/crudControllerFactory');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  buildCreateValidators,
  buildUpdateValidators,
  idParamValidator,
} = require('./validators/genericValidator');

/**
 * Mounts GET (list+one), POST, PUT, DELETE for one entity config.
 *
 * @param {object} entity                 config from models/entities.js
 * @param {object} [opts]
 * @param {boolean} [opts.readOnly]       only mount GET routes (e.g. audit_log)
 * @param {boolean} [opts.audited]        write audit_log rows on write ops
 * @param {number[]} [opts.writeRoles]    role_ids allowed to create/update/delete
 * @param {object}  [opts.controller]     pre-built controller (short_courses/projects); falls back to generic
 */
function buildEntityRouter(entity, opts = {}) {
  const router = express.Router();
  const controller = opts.controller || createCrudController(entity, { audited: opts.audited });
  const writeGuard = opts.writeRoles && opts.writeRoles.length ? [authenticate, authorize(...opts.writeRoles)] : [authenticate];

  router.get('/', authenticate, controller.getAll);
  router.get('/:id', authenticate, idParamValidator(), validate, controller.getOne);

  if (!opts.readOnly) {
    router.post('/', ...writeGuard, buildCreateValidators(entity), validate, controller.create);
    router.put(
      '/:id',
      ...writeGuard,
      idParamValidator(),
      buildUpdateValidators(entity),
      validate,
      controller.update
    );
    router.delete('/:id', ...writeGuard, idParamValidator(), validate, controller.remove);
  }

  return router;
}

module.exports = buildEntityRouter;
