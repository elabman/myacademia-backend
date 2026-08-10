const entities = require('../models/entities');
const createCrudController = require('./crudControllerFactory');
const { BaseRepository } = require('../models/BaseRepository');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { query } = require('../config/database');
const { sendSuccess } = require('../utils/apiResponse');

const entity = entities.mou_agreements;
const base = createCrudController(entity, { audited: true });

const linkRepo = new BaseRepository(entities.mou_collaboration_links);

/**
 * mou_agreements has a DB-level CHECK (expiry_date >= effective_date).
 * Re-validated at the app layer so the client gets a clean 422 instead
 * of a raw MySQL constraint error.
 */
async function assertDateOrder(mouId, body) {
  let { effective_date: effective, expiry_date: expiry } = body;
  if (effective === undefined || expiry === undefined) {
    const rows = await query(`SELECT effective_date, expiry_date FROM mou_agreements WHERE mou_id = ?`, [mouId]);
    const current = rows[0] || {};
    if (effective === undefined) effective = current.effective_date;
    if (expiry === undefined) expiry = current.expiry_date;
  }
  if (effective && expiry && new Date(expiry) < new Date(effective)) {
    throw ApiError.unprocessable('expiry_date must be on or after effective_date');
  }
}

const create = catchAsync(async (req, res) => {
  await assertDateOrder(null, req.body);
  return base.create(req, res);
});

const update = catchAsync(async (req, res) => {
  await assertDateOrder(req.params.id, req.body);
  return base.update(req, res);
});

/** GET /mou-agreements/:id/full - enriched record + linked collaboration areas (mirrors v_mou_agreements_full) */
const getFull = catchAsync(async (req, res) => {
  const mou = await base.repo.findById(req.params.id);
  if (!mou) throw ApiError.notFound('mou_agreements record not found');

  const collaborationAreas = await query(
    `SELECT ca.collaboration_area_id, ca.area_name
     FROM mou_collaboration_links mcl JOIN collaboration_areas ca ON ca.collaboration_area_id = mcl.collaboration_area_id
     WHERE mcl.mou_id = ?`,
    [req.params.id]
  );

  sendSuccess(res, {
    message: 'mou_agreements record retrieved successfully',
    data: { ...mou, collaboration_areas: collaborationAreas },
  });
});

// ---- M2M: collaboration areas ----
const listCollaborationAreas = catchAsync(async (req, res) => {
  const rows = await query(
    `SELECT ca.collaboration_area_id, ca.area_name
     FROM mou_collaboration_links mcl JOIN collaboration_areas ca ON ca.collaboration_area_id = mcl.collaboration_area_id
     WHERE mcl.mou_id = ?`,
    [req.params.id]
  );
  sendSuccess(res, { message: 'MoU collaboration areas retrieved successfully', data: rows });
});

const addCollaborationArea = catchAsync(async (req, res) => {
  const payload = { mou_id: req.params.id, collaboration_area_id: req.body.collaboration_area_id };
  const created = await linkRepo.create(payload);
  sendSuccess(res, { statusCode: 201, message: 'Collaboration area linked to MoU', data: created });
});

const removeCollaborationArea = catchAsync(async (req, res) => {
  await linkRepo.removeByCompositeKey({
    mou_id: req.params.id,
    collaboration_area_id: req.params.areaId,
  });
  sendSuccess(res, { message: 'Collaboration area unlinked from MoU' });
});

/** GET /mou-agreements/summary - dashboard aggregate by status, plus expiring-soon count */
const summary = catchAsync(async (req, res) => {
  const byStatus = await query(
    `SELECT status, COUNT(*) AS mou_count FROM mou_agreements GROUP BY status`
  );
  const expiringSoon = await query(
    `SELECT COUNT(*) AS expiring_within_90_days FROM mou_agreements
     WHERE status = 'Active' AND expiry_date IS NOT NULL
       AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)`
  );
  sendSuccess(res, {
    message: 'MoU summary retrieved successfully',
    data: { byStatus, expiringWithin90Days: expiringSoon[0]?.expiring_within_90_days || 0 },
  });
});

/** GET /mou-agreements/expiring - MoUs expiring within N days (default 90), for renewal follow-up */
const expiring = catchAsync(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 90, 1), 3650);
  const { cols, joinClauses } = base.repo.buildSelectClause();
  const rows = await query(
    `SELECT ${cols} FROM mou_agreements t ${joinClauses}
     WHERE t.status = 'Active' AND t.expiry_date IS NOT NULL
       AND t.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
     ORDER BY t.expiry_date ASC`,
    [days]
  );
  sendSuccess(res, { message: `MoUs expiring within ${days} days`, data: rows });
});

module.exports = {
  ...base,
  create,
  update,
  getFull,
  summary,
  expiring,
  listCollaborationAreas,
  addCollaborationArea,
  removeCollaborationArea,
};
