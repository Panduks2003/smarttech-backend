import { Router } from 'express';
import ProductController from '../controllers/ProductController.js';

const router = Router();

// Public routes
router.get('/', ProductController.getAllProducts);
router.get('/category/:category', ProductController.getByCategory);
router.get('/search', ProductController.search);
router.get('/:id', ProductController.getProduct);

// Protected routes (Admin only)
router.post('/', ProductController.createProduct);
router.put('/:id', ProductController.updateProduct);
router.delete('/:id', ProductController.deleteProduct);

export default router;
