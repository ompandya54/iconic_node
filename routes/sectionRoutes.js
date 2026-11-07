const express = require('express');
const router = express.Router();
const {
  getActiveSectionsWithProducts,
  getAllSections,
  createSection,
  updateSection,
  toggleSectionStatus,
  deleteSection,
} = require('../controllers/sectionController');
const { protectAdmin } = require('../middlewares/authMiddleware');

// Public route: Landing Page calls this to get all active sections with products
router.get('/active', getActiveSectionsWithProducts);

// Admin routes: Manage landing page sections
router
  .route('/')
  .get(protectAdmin, getAllSections)
  .post(protectAdmin, createSection);

router.patch('/:id/toggle', protectAdmin, toggleSectionStatus);

router
  .route('/:id')
  .put(protectAdmin, updateSection)
  .delete(protectAdmin, deleteSection);

module.exports = router;

