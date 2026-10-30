const express = require('express');
const controller = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { idParamValidator } = require('./validators/genericValidator');
const ROLES = require('../utils/roles');

const router = express.Router();

// Everyone except plain Coordinators may read submitted reviews. Reviews are
// created only through POST /public/reviews, so there are no write routes here.
const readRoles = [
  ROLES.PRINCIPAL,
  ROLES.DIRECTOR_OF_PLANNING,
  ROLES.HOD,
  ROLES.CDSM,
  ROLES.ADMINISTRATOR,
];

router.get('/', authenticate, authorize(...readRoles), controller.getAll);
router.get('/:id', authenticate, authorize(...readRoles), idParamValidator(), validate, controller.getOne);

module.exports = router;
