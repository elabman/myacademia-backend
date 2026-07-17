const entities = require('../models/entities');
const createCrudController = require('./crudControllerFactory');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { query } = require('../config/database');
const { sendSuccess } = require('../utils/apiResponse');

const entity = entities.short_courses;
const base = createCrudController(entity, { audited: true });

/**
 * short_courses has a DB-level CHECK (total_certified <= total_participants,
 * where total_participants = participants_female + participants_male is a
 * GENERATED column). We re-validate at the app layer too so the client
 * gets a clean 422 instead of a raw MySQL constraint error.
 */
async function assertCertifiedWithinParticipants(courseId, body) {
  let female = body.participants_female;
  let male = body.participants_male;
  let certified = body.total_certified;

  if (female === undefined || male === undefined || certified === undefined) {
    const rows = await query(
      `SELECT participants_female, participants_male, total_certified FROM short_courses WHERE course_id = ?`,
      [courseId]
    );
    const current = rows[0] || { participants_female: 0, participants_male: 0, total_certified: 0 };
    if (female === undefined) female = current.participants_female;
    if (male === undefined) male = current.participants_male;
    if (certified === undefined) certified = current.total_certified;
  }

  if (Number(certified) > Number(female) + Number(male)) {
    throw ApiError.unprocessable(
      'total_certified cannot exceed total_participants (participants_female + participants_male)'
    );
  }
}

const create = catchAsync(async (req, res) => {
  await assertCertifiedWithinParticipants(null, req.body);
  return base.create(req, res);
});

const update = catchAsync(async (req, res) => {
  await assertCertifiedWithinParticipants(req.params.id, req.body);
  return base.update(req, res);
});

/** GET /short-courses/summary - quick dashboard aggregate by status */
const summary = catchAsync(async (req, res) => {
  const rows = await query(
    `SELECT status, COUNT(*) AS course_count, SUM(total_participants) AS total_participants,
            SUM(expected_revenue) AS total_expected_revenue
     FROM short_courses GROUP BY status`
  );
  sendSuccess(res, { message: 'Short course summary retrieved successfully', data: rows });
});

module.exports = {
  ...base,
  create,
  update,
  summary,
};
