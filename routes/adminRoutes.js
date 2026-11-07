const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getAdminProfile,
  createAdmin,
  getDashboardStats,
} = require('../controllers/adminController');
const { protectAdmin } = require('../middlewares/authMiddleware');

router.post('/login', adminLogin);
router.get('/me', protectAdmin, getAdminProfile);
router.post('/create', protectAdmin, createAdmin);
router.get('/dashboard', protectAdmin, getDashboardStats);

module.exports = router;

