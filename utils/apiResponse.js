/**
 * Uniform success response envelope used by every endpoint.
 */
function sendSuccess(res, { statusCode = 200, message = 'Success', data = null, meta = null }) {
  const body = { success: true, message };
  if (meta) body.meta = meta;
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess };
