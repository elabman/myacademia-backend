const entities = require('../models/entities');
const createCrudController = require('./crudControllerFactory');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { query, withTransaction } = require('../config/database');
const { sendSuccess } = require('../utils/apiResponse');
const auditService = require('../services/auditService');

const entity = entities.services;
const base = createCrudController(entity);
const { repo } = base;

const placeholders = (items) => items.map(() => '?').join(', ');

/** Adds `departments: [{ department_id, department_name }]` to each service row. */
async function withDepartments(rows) {
  if (rows.length === 0) return rows;

  const links = await query(
    `SELECT sd.service_id, d.department_id, d.department_name
     FROM service_departments sd
     JOIN departments d ON d.department_id = sd.department_id
     WHERE sd.service_id IN (${placeholders(rows)})
     ORDER BY d.department_name`,
    rows.map((row) => row.service_id)
  );

  return rows.map((row) => ({
    ...row,
    departments: links
      .filter((link) => link.service_id === row.service_id)
      .map(({ department_id, department_name }) => ({ department_id, department_name })),
  }));
}

/** Unique department ids from the body, or undefined when the field is absent. */
function readDepartmentIds(body) {
  if (body.department_ids === undefined || body.department_ids === null) return undefined;
  return [...new Set(body.department_ids.map(Number))];
}

async function assertDepartmentsExist(ids) {
  if (!ids || ids.length === 0) return;

  const rows = await query(
    `SELECT department_id FROM departments WHERE department_id IN (${placeholders(ids)})`,
    ids
  );
  const found = new Set(rows.map((row) => row.department_id));
  const missing = ids.filter((id) => !found.has(id));

  if (missing.length > 0) {
    throw ApiError.badRequest(`Invalid department_ids: ${missing.join(', ')}`);
  }
}

/** Replaces the service's department links with exactly `ids`. */
async function replaceDepartments(serviceId, ids) {
  await withTransaction(async (tx) => {
    await tx.query('DELETE FROM service_departments WHERE service_id = ?', [serviceId]);

    if (ids.length > 0) {
      await tx.query(
        `INSERT INTO service_departments (service_id, department_id) VALUES ${ids
          .map(() => '(?, ?)')
          .join(', ')}`,
        ids.flatMap((id) => [serviceId, id])
      );
    }
  });
}

async function loadOne(id) {
  const service = await repo.findById(id);
  if (!service) return null;
  return (await withDepartments([service]))[0];
}

// The list is small and the UI shows it whole, so default to the maximum page size.
const getAll = catchAsync(async (req, res) => {
  const { rows, meta } = await repo.findAll({ ...req.query, limit: req.query.limit || 100 });
  sendSuccess(res, {
    message: 'services retrieved successfully',
    data: await withDepartments(rows),
    meta,
  });
});

const getOne = catchAsync(async (req, res) => {
  const service = await loadOne(req.params.id);
  if (!service) throw ApiError.notFound('services record not found');
  sendSuccess(res, { message: 'services record retrieved successfully', data: service });
});

const create = catchAsync(async (req, res) => {
  const departmentIds = readDepartmentIds(req.body);
  await assertDepartmentsExist(departmentIds);

  const created = await repo.create(req.body);
  if (departmentIds) await replaceDepartments(created.service_id, departmentIds);

  const data = await loadOne(created.service_id);
  await auditService.record({
    userId: req.user?.id || null,
    tableName: entity.table,
    recordId: created.service_id,
    action: 'INSERT',
    newValues: data,
  });
  sendSuccess(res, { statusCode: 201, message: 'services record created successfully', data });
});

const update = catchAsync(async (req, res) => {
  const before = await loadOne(req.params.id);
  if (!before) throw ApiError.notFound('services record not found');

  const departmentIds = readDepartmentIds(req.body);
  await assertDepartmentsExist(departmentIds);

  // A body with only department_ids has no service columns to update.
  if (Object.keys(repo.pickFillable(req.body)).length > 0) {
    await repo.update(req.params.id, req.body);
  } else if (departmentIds === undefined) {
    throw ApiError.badRequest('No valid fields provided to update');
  }
  if (departmentIds) await replaceDepartments(req.params.id, departmentIds);

  const data = await loadOne(req.params.id);
  await auditService.record({
    userId: req.user?.id || null,
    tableName: entity.table,
    recordId: req.params.id,
    action: 'UPDATE',
    oldValues: before,
    newValues: data,
  });
  sendSuccess(res, { message: 'services record updated successfully', data });
});

// Services that already have reviews are blocked by the FK (409 from the error handler).
const remove = catchAsync(async (req, res) => {
  const before = await loadOne(req.params.id);
  await repo.remove(req.params.id);
  await auditService.record({
    userId: req.user?.id || null,
    tableName: entity.table,
    recordId: req.params.id,
    action: 'DELETE',
    oldValues: before,
  });
  sendSuccess(res, { message: 'services record deleted successfully' });
});

module.exports = { getAll, getOne, create, update, remove };
