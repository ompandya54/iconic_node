import express from 'express';
import {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  updateOrderToPaid,
  deleteOrder,
} from '../controllers/orderController.js';
import { protect, protectAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(createOrder)
  .get(protectAdmin, getAllOrders);

router.get('/myorders', protect, getMyOrders);

router.route('/:id')
  .get(getOrderById)
  .delete(protectAdmin, deleteOrder);

router.put('/:id/status', protectAdmin, updateOrderStatus);
router.put('/:id/pay', protect, updateOrderToPaid);

export default router;
