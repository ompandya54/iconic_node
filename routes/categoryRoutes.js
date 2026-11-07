const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protectAdmin } = require('../middlewares/authMiddleware');

router.route('/')
  .get(getCategories)
  .post(protectAdmin, createCategory);

router.route('/:id')
  .get(getCategoryById)
  .put(protectAdmin, updateCategory)
  .delete(protectAdmin, deleteCategory);

module.exports = router;

