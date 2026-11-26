const crypto = require('crypto');
const entities = require('../models/entities');
const createCrudController = require('./crudControllerFactory');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { query } = require('../config/database');
const { notifyReview } = require('../services/reviewNotificationService');
const { sendSuccess } = require('../utils/apiResponse');

const entity = entities.reviews;
const base = createCrudController(entity);

// ---------------------------------------------------------------
// Admin: GET /reviews, GET /reviews/:id
// ---------------------------------------------------------------
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// ?created_at_lte=2026-10-30 should include that whole day.
const getAll = (req, res, next) => {
  if (DATE_ONLY.test(req.query.created_at_lte || '')) {
    req.query.created_at_lte = `${req.query.created_at_lte} 23:59:59`;
  }
  // The admin table shows everything at once, so default to the maximum page size.
  req.query.limit = req.query.limit || 100;
  return base.getAll(req, res, next);
};

// ---------------------------------------------------------------
// Public (no auth)
// ---------------------------------------------------------------
const INVALID_LINK = 'This review link is not valid.';

async function findActiveStaff(staffId) {
  const rows = await query(
    `SELECT s.staff_id, s.full_name, s.department_id, d.department_name
     FROM staff s
     LEFT JOIN departments d ON d.department_id = s.department_id
     WHERE s.staff_id = ? AND s.is_active = 1
     LIMIT 1`,
    [staffId]
  );
  return rows[0] || null;
}

/** Strips HTML tags and surrounding whitespace; empty text becomes null. */
function cleanText(value) {
  if (value === undefined || value === null) return null;
  return String(value).replace(/<[^>]*>/g, '').trim() || null;
}

/** GET /public/reviews/staff/:staffId - the staff member plus services of their department. */
const getTarget = catchAsync(async (req, res) => {
  const staff = await findActiveStaff(req.params.staffId);
  if (!staff) throw ApiError.notFound(INVALID_LINK);

  const services = staff.department_id
    ? await query(
        `SELECT sv.service_id, sv.name, sv.description
         FROM services sv
         JOIN service_departments sd ON sd.service_id = sv.service_id
         WHERE sd.department_id = ?
         ORDER BY sv.name`,
        [staff.department_id]
      )
    : [];

  // Only these fields are public - no email, phone or internal ids beyond what the form needs.
  sendSuccess(res, {
    message: 'Review target retrieved successfully',
    data: {
      staff: {
        staff_id: staff.staff_id,
        full_name: staff.full_name,
        department_name: staff.department_name,
      },
      services,
    },
  });
});

/** POST /public/reviews */
const submit = catchAsync(async (req, res) => {
  const { staff_id: staffId, service_id: serviceId, rating } = req.body;

  const staff = await findActiveStaff(staffId);
  if (!staff) throw ApiError.notFound(INVALID_LINK);

  // The service must be offered by the staff member's department (stops forged requests).
  const offered = staff.department_id
    ? await query(
        `SELECT sv.name
         FROM service_departments sd
         JOIN services sv ON sv.service_id = sd.service_id
         WHERE sd.service_id = ? AND sd.department_id = ?
         LIMIT 1`,
        [serviceId, staff.department_id]
      )
    : [];
  if (offered.length === 0) {
    throw ApiError.badRequest('This service is not offered by this staff member.');
  }

  const result = await query(
    `INSERT INTO reviews (staff_id, service_id, rating, comment, reviewer_name, client_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      staffId,
      serviceId,
      rating,
      cleanText(req.body.comment),
      cleanText(req.body.reviewer_name),
      crypto.createHash('sha256').update(String(req.ip)).digest('hex'),
    ]
  );

  sendSuccess(res, {
    statusCode: 201,
    message: 'Thank you! Your review has been saved.',
    data: { review_id: result.insertId },
  });

  notifyReview({
    reviewId: result.insertId,
    staffName: staff.full_name,
    serviceName: offered[0].name,
    rating,
  }).catch((error) => {
    console.error('Review notification failed', { reviewId: result.insertId, code: error.code });
  });
});

module.exports = { getAll, getOne: base.getOne, getTarget, submit };
