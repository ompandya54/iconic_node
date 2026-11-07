import express from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protectAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getCategories)
  .post(protectAdmin, createCategory);

router.route('/:id')
  .get(getCategoryById)
  .put(protectAdmin, updateCategory)
  .delete(protectAdmin, deleteCategory);

export default router;
