const express = require('express');
const { body } = require('express-validator');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { getSettings, saveSettings } = require('../services/reviewNotificationService');
const controller = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { idParamValidator } = require('./validators/genericValidator');
const ROLES = require('../utils/roles');

const router = express.Router();

const adminOnly = [authenticate, authorize(ROLES.ADMINISTRATOR)];

router.get('/notification-settings', adminOnly, catchAsync(async (_req, res) => {
  sendSuccess(res, { data: await getSettings() });
}));

router.put(
  '/notification-settings',
  adminOnly,
  body('enabled').custom((value) => typeof value === 'boolean').withMessage('Choose whether notifications are enabled.'),
  body('recipient_email')
    .isString().withMessage('Enter a recipient email address.').bail().trim()
    .if((value, { req }) => value !== '' || req.body.enabled === true)
    .isLength({ max: 254 }).isEmail().withMessage('Enter a valid recipient email address.'),
  validate,
  catchAsync(async (req, res) => {
    const { recipient_email, enabled } = req.body;
    sendSuccess(res, { data: await saveSettings({ recipient_email, enabled }) });
  })
);

// Everyone except plain Coordinators may read submitted reviews.
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
