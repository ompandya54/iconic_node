import express from 'express';
import {
  getProducts,
  getProductById,
  getProductAttributes,
  getBestsellers,
  getFeaturedProducts,
  getNewArrivals,
  getRelatedProducts,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  createProductReview,
} from '../controllers/productController.js';
import { protect, protectAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Specific endpoints before parameterized /:id routes
router.get('/attributes', getProductAttributes);
router.get('/bestsellers', getBestsellers);
router.get('/featured', getFeaturedProducts);
router.get('/new-arrivals', getNewArrivals);
router.get('/admin/all', protectAdmin, getAdminProducts);

router
  .route('/')
  .get(getProducts)
  .post(protectAdmin, createProduct);

router.patch('/:id/toggle-status', protectAdmin, toggleProductStatus);
router.get('/:id/related', getRelatedProducts);

router
  .route('/:id')
  .get(getProductById)
  .put(protectAdmin, updateProduct)
  .delete(protectAdmin, deleteProduct);

router.post('/:id/reviews', protect, createProductReview);

export default router;
