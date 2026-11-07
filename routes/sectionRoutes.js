import express from 'express';
import {
  getActiveSectionsWithProducts,
  getAllSections,
  createSection,
  updateSection,
  toggleSectionStatus,
  deleteSection,
} from '../controllers/sectionController.js';
import { protectAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

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

export default router;
