const formService = require('../services/formService');
const { listTemplates } = require('../data/formTemplates');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/apiResponse');
const auditService = require('../services/auditService');

const audit = (req, action, formId, newValues) =>
  auditService.record({ userId: req.user?.id || null, tableName: 'forms', recordId: formId, action, newValues });

// ---- admin ----
const templates = catchAsync(async (req, res) => {
  sendSuccess(res, { message: 'Form templates retrieved successfully', data: listTemplates() });
});

const list = catchAsync(async (req, res) => {
  sendSuccess(res, {
    message: 'Forms retrieved successfully',
    data: await formService.listForms({ shortCourseId: req.query.short_course_id }),
  });
});

const getOne = catchAsync(async (req, res) => {
  const form = await formService.getFormById(req.params.id);
  if (!form) throw ApiError.notFound('Form not found');
  sendSuccess(res, { message: 'Form retrieved successfully', data: form });
});

const create = catchAsync(async (req, res) => {
  const form = await formService.createForm(req.body, req.user?.id);
  await audit(req, 'INSERT', form.form_id, { title: form.title });
  sendSuccess(res, { statusCode: 201, message: 'Form created successfully', data: form });
});

const update = catchAsync(async (req, res) => {
  const form = await formService.saveForm(req.params.id, req.body, req.user?.id);
  await audit(req, 'UPDATE', form.form_id, { title: form.title });
  sendSuccess(res, { message: 'Form saved successfully', data: form });
});

const publish = catchAsync(async (req, res) => {
  const form = await formService.publishForm(req.params.id);
  await audit(req, 'UPDATE', form.form_id, { status: 'published' });
  sendSuccess(res, { message: 'Form published successfully', data: form });
});

const close = catchAsync(async (req, res) => {
  const form = await formService.setFormStatus(req.params.id, 'closed');
  await audit(req, 'UPDATE', form.form_id, { status: 'closed' });
  sendSuccess(res, { message: 'Form closed successfully', data: form });
});

const unpublish = catchAsync(async (req, res) => {
  const form = await formService.setFormStatus(req.params.id, 'draft');
  await audit(req, 'UPDATE', form.form_id, { status: 'draft' });
  sendSuccess(res, { message: 'Form moved back to draft', data: form });
});

const remove = catchAsync(async (req, res) => {
  await formService.deleteForm(req.params.id);
  await audit(req, 'DELETE', req.params.id, null);
  sendSuccess(res, { message: 'Form deleted successfully' });
});

const responses = catchAsync(async (req, res) => {
  const data = await formService.listResponses(req.params.id, req.query);
  sendSuccess(res, { message: 'Responses retrieved successfully', data });
});

const removeResponse = catchAsync(async (req, res) => {
  await formService.deleteResponse(req.params.id, req.params.responseId);
  sendSuccess(res, { message: 'Response deleted successfully' });
});

// ---- public (no auth) ----
const publicForm = catchAsync(async (req, res) => {
  sendSuccess(res, { message: 'Form retrieved successfully', data: await formService.getPublicForm(req.params.slug) });
});

const submit = catchAsync(async (req, res) => {
  const message = await formService.submitResponse(req.params.slug, req.body.answers, req);
  sendSuccess(res, { statusCode: 201, message, data: { message } });
});

module.exports = {
  templates, list, getOne, create, update, publish, close, unpublish, remove,
  responses, removeResponse, publicForm, submit,
};
