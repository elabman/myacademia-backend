const { body } = require('express-validator');

const registerValidators = [
  body('full_name').trim().notEmpty().withMessage('full_name is required').isLength({ max: 150 }),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('role_id').isInt({ min: 1 }).withMessage('role_id must be a positive integer').toInt(),
  body('department_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('phone').optional({ nullable: true }).matches(/^\+?[0-9\s\-()]{7,20}$/).withMessage('Invalid phone number'),
];

const loginValidators = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidators = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
];

const resetPasswordValidators = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
];

const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('currentPassword is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
];

const refreshValidators = [
  body('refreshToken').notEmpty().withMessage('refreshToken is required'),
];

const updateProfileValidators = [
  body('full_name').optional().trim().isLength({ min: 1, max: 150 }),
  body('phone').optional({ nullable: true }).matches(/^\+?[0-9\s\-()]{7,20}$/).withMessage('Invalid phone number'),
];

module.exports = {
  registerValidators,
  loginValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  changePasswordValidators,
  refreshValidators,
  updateProfileValidators,
};
