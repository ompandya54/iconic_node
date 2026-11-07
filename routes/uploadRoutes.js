import express from 'express';
import {
  uploadSingleImage,
  uploadMultipleImages,
} from '../controllers/uploadController.js';
import { protectAdmin } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.post('/', protectAdmin, upload.single('image'), uploadSingleImage);
router.post('/multiple', protectAdmin, upload.array('images', 10), uploadMultipleImages);

export default router;
