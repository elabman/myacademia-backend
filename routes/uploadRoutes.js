const express = require('express');
const upload = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

router.post('/', authenticate, upload.single('file'), uploadController.uploadFile);

module.exports = router;
