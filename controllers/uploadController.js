const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');

/**
 * Generic file upload endpoint. Used, for example, to attach a signed
 * MoU/agreement document to a project, or a supporting document to a
 * short course record. Returns the stored file path/URL; the caller
 * can then PATCH that path onto the relevant record if a document
 * column is added for it later.
 */
const uploadFile = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file was uploaded');
  sendSuccess(res, {
    statusCode: 201,
    message: 'File uploaded successfully',
    data: {
      originalName: req.file.originalname,
      storedAs: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
      url: `/uploads/${req.file.filename}`,
    },
  });
});

module.exports = { uploadFile };
