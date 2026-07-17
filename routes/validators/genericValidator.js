const { body, param } = require('express-validator');

/**
 * Builds express-validator chains from an entity's config
 * (models/entities.js) so every table gets consistent, meaningful
 * validation (required fields, enums, numeric/date checks) without
 * hand-writing a rule set per table.
 */

const NUMERIC_ID_FIELDS = /(_id)$/;
const DATE_FIELDS = /(_date)$/;
const EMAIL_FIELDS = /^email$/;
const PHONE_FIELDS = /^phone$/;
const DECIMAL_FIELDS = /(amount|budget|fee|_pct|_usd|_rwf)/i;

function fieldRule(field, isRequired, entity) {
  let chain = body(field);

  if (isRequired) {
    chain = chain.notEmpty().withMessage(`${field} is required`);
  } else {
    chain = chain.optional({ nullable: true });
  }

  if (entity.enum && entity.enum[field]) {
    chain = chain.isIn(entity.enum[field]).withMessage(`${field} must be one of: ${entity.enum[field].join(', ')}`);
  } else if (EMAIL_FIELDS.test(field)) {
    chain = chain.isEmail().withMessage('A valid email address is required').normalizeEmail();
  } else if (PHONE_FIELDS.test(field)) {
    chain = chain.matches(/^\+?[0-9\s\-()]{7,20}$/).withMessage('A valid phone number is required');
  } else if (NUMERIC_ID_FIELDS.test(field)) {
    chain = chain.isInt({ min: 1 }).withMessage(`${field} must be a positive integer`).toInt();
  } else if (DATE_FIELDS.test(field)) {
    chain = chain.isISO8601().withMessage(`${field} must be a valid date (YYYY-MM-DD)`).toDate();
  } else if (DECIMAL_FIELDS.test(field)) {
    chain = chain.isFloat({ min: 0 }).withMessage(`${field} must be a non-negative number`).toFloat();
  } else if (field === 'is_active') {
    chain = chain.isBoolean().withMessage('is_active must be true/false').toBoolean();
  } else {
    chain = chain.isString().trim().isLength({ min: 1, max: 500 }).withMessage(`${field} must be a valid string`);
  }

  return chain;
}

function buildCreateValidators(entity) {
  const required = new Set(entity.required || []);
  return (entity.fillable || [])
    .filter((f) => !(entity.generated || []).includes(f))
    .map((f) => fieldRule(f, required.has(f), entity));
}

function buildUpdateValidators(entity) {
  return (entity.fillable || [])
    .filter((f) => !(entity.generated || []).includes(f))
    .map((f) => fieldRule(f, false, entity));
}

function idParamValidator(paramName = 'id') {
  return [param(paramName).isInt({ min: 1 }).withMessage(`${paramName} must be a positive integer`).toInt()];
}

module.exports = { buildCreateValidators, buildUpdateValidators, idParamValidator };
