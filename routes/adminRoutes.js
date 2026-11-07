import express from 'express';
import {
  adminLogin,
  getAdminProfile,
  createAdmin,
  getDashboardStats,
} from '../controllers/adminController.js';
import { protectAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', adminLogin);
router.get('/me', protectAdmin, getAdminProfile);
router.post('/create', protectAdmin, createAdmin);
router.get('/dashboard', protectAdmin, getDashboardStats);

export default router;
