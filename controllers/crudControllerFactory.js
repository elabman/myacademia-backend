const { BaseRepository } = require('../models/BaseRepository');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const auditService = require('../services/auditService');

/**
 * Builds a { getAll, getOne, create, update, remove } controller set
 * for a given entity config (models/entities.js). Every table in the
 * database reuses this factory instead of hand-written duplicate CRUD
 * controllers.
 *
 * @param {object} entity        entity config
 * @param {object} [options]
 * @param {boolean} [options.audited]  write an audit_log row on create/update/delete
 */
function createCrudController(entity, options = {}) {
  const repo = new BaseRepository(entity);
  const { audited = false } = options;

  const getAll = catchAsync(async (req, res) => {
    const { rows, meta } = await repo.findAll(req.query);
    sendSuccess(res, {
      message: `${entity.table} retrieved successfully`,
      data: rows,
      meta,
    });
  });

  const getOne = catchAsync(async (req, res) => {
    const record = await repo.findById(req.params.id);
    if (!record) throw ApiError.notFound(`${entity.table} record not found`);
    sendSuccess(res, { message: `${entity.table} record retrieved successfully`, data: record });
  });

  const create = catchAsync(async (req, res) => {
    const created = await repo.create(req.body);
    if (audited) {
      await auditService.record({
        userId: req.user?.id || null,
        tableName: entity.table,
        recordId: created[entity.pk],
        action: 'INSERT',
        newValues: created,
      });
    }
    sendSuccess(res, {
      statusCode: 201,
      message: `${entity.table} record created successfully`,
      data: created,
    });
  });

  const update = catchAsync(async (req, res) => {
    const before = audited ? await repo.findById(req.params.id) : null;
    const updated = await repo.update(req.params.id, req.body);
    if (audited) {
      await auditService.record({
        userId: req.user?.id || null,
        tableName: entity.table,
        recordId: req.params.id,
        action: 'UPDATE',
        oldValues: before,
        newValues: updated,
      });
    }
    sendSuccess(res, { message: `${entity.table} record updated successfully`, data: updated });
  });

  const remove = catchAsync(async (req, res) => {
    const before = audited ? await repo.findById(req.params.id) : null;
    await repo.remove(req.params.id);
    if (audited) {
      await auditService.record({
        userId: req.user?.id || null,
        tableName: entity.table,
        recordId: req.params.id,
        action: 'DELETE',
        oldValues: before,
      });
    }
    sendSuccess(res, { statusCode: 200, message: `${entity.table} record deleted successfully` });
  });

  return { repo, getAll, getOne, create, update, remove };
}

module.exports = createCrudController;
