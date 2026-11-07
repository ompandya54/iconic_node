const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  updateOrderToPaid,
  deleteOrder,
} = require('../controllers/orderController');
const { protect, protectAdmin } = require('../middlewares/authMiddleware');

router.route('/')
  .post(createOrder)
  .get(protectAdmin, getAllOrders);

router.get('/myorders', protect, getMyOrders);

router.route('/:id')
  .get(getOrderById)
  .delete(protectAdmin, deleteOrder);

router.put('/:id/status', protectAdmin, updateOrderStatus);
router.put('/:id/pay', protect, updateOrderToPaid);

module.exports = router;

