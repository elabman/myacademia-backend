const entities = require('../models/entities');
const createCrudController = require('./crudControllerFactory');
const { BaseRepository } = require('../models/BaseRepository');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { query } = require('../config/database');
const { sendSuccess } = require('../utils/apiResponse');

const entity = entities.projects;
const base = createCrudController(entity, { audited: true });

const deptRepo = new BaseRepository(entities.project_departments);
const partnerRepo = new BaseRepository(entities.project_partners);

async function assertDateOrder(projectId, body) {
  let { start_date: start, end_date: end } = body;
  if (start === undefined || end === undefined) {
    const rows = await query(`SELECT start_date, end_date FROM projects WHERE project_id = ?`, [projectId]);
    const current = rows[0] || {};
    if (start === undefined) start = current.start_date;
    if (end === undefined) end = current.end_date;
  }
  if (start && end && new Date(end) < new Date(start)) {
    throw ApiError.unprocessable('end_date must be on or after start_date');
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

/** GET /projects/:id/full - project enriched with joined data + M2M lists (mirrors v_projects_full) */
const getFull = catchAsync(async (req, res) => {
  const project = await base.repo.findById(req.params.id);
  if (!project) throw ApiError.notFound('project not found');

  const departments = await query(
    `SELECT d.department_id, d.department_name
     FROM project_departments pd JOIN departments d ON d.department_id = pd.department_id
     WHERE pd.project_id = ?`,
    [req.params.id]
  );
  const partners = await query(
    `SELECT po.partner_id, po.partner_name
     FROM project_partners pp JOIN partner_organisations po ON po.partner_id = pp.partner_id
     WHERE pp.project_id = ?`,
    [req.params.id]
  );

  sendSuccess(res, {
    message: 'project retrieved successfully',
    data: { ...project, departments, partners },
  });
});

// ---- M2M: target departments ----
const addDepartment = catchAsync(async (req, res) => {
  const payload = { project_id: req.params.id, department_id: req.body.department_id };
  const created = await deptRepo.create(payload);
  sendSuccess(res, { statusCode: 201, message: 'Department linked to project', data: created });
});

const listDepartments = catchAsync(async (req, res) => {
  const rows = await query(
    `SELECT d.department_id, d.department_name
     FROM project_departments pd JOIN departments d ON d.department_id = pd.department_id
     WHERE pd.project_id = ?`,
    [req.params.id]
  );
  sendSuccess(res, { message: 'Project departments retrieved successfully', data: rows });
});

const removeDepartment = catchAsync(async (req, res) => {
  await deptRepo.removeByCompositeKey({
    project_id: req.params.id,
    department_id: req.params.departmentId,
  });
  sendSuccess(res, { message: 'Department unlinked from project' });
});

// ---- M2M: partner organisations ----
const addPartner = catchAsync(async (req, res) => {
  const payload = { project_id: req.params.id, partner_id: req.body.partner_id };
  const created = await partnerRepo.create(payload);
  sendSuccess(res, { statusCode: 201, message: 'Partner linked to project', data: created });
});

const listPartners = catchAsync(async (req, res) => {
  const rows = await query(
    `SELECT po.partner_id, po.partner_name
     FROM project_partners pp JOIN partner_organisations po ON po.partner_id = pp.partner_id
     WHERE pp.project_id = ?`,
    [req.params.id]
  );
  sendSuccess(res, { message: 'Project partners retrieved successfully', data: rows });
});

const removePartner = catchAsync(async (req, res) => {
  await partnerRepo.removeByCompositeKey({
    project_id: req.params.id,
    partner_id: req.params.partnerId,
  });
  sendSuccess(res, { message: 'Partner unlinked from project' });
});

/** GET /projects/summary - dashboard aggregate by status */
const summary = catchAsync(async (req, res) => {
  const rows = await query(
    `SELECT overall_status, COUNT(*) AS project_count,
            SUM(total_budget_usd) AS total_budget_usd,
            SUM(total_budget_rwf) AS total_budget_rwf
     FROM projects GROUP BY overall_status`
  );
  sendSuccess(res, { message: 'Project summary retrieved successfully', data: rows });
});

module.exports = {
  ...base,
  create,
  update,
  getFull,
  summary,
  addDepartment,
  listDepartments,
  removeDepartment,
  addPartner,
  listPartners,
  removePartner,
};
