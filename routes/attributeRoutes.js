import express from 'express';
import {
  getAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  seedAttributes,
} from '../controllers/attributeController.js';
import { protectAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET is public so storefront filters & product forms can load attributes
router.route('/')
  .get(getAttributes)
  .post(protectAdmin, createAttribute);

router.post('/seed', protectAdmin, seedAttributes);

router.route('/:id')
  .put(protectAdmin, updateAttribute)
  .delete(protectAdmin, deleteAttribute);

export default router;

