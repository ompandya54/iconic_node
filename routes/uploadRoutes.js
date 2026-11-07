const express = require('express');
const router = express.Router();
const {
  uploadSingleImage,
  uploadMultipleImages,
} = require('../controllers/uploadController');
const { protectAdmin } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

router.post('/', protectAdmin, upload.single('image'), uploadSingleImage);
router.post('/multiple', protectAdmin, upload.array('images', 10), uploadMultipleImages);

module.exports = router;

