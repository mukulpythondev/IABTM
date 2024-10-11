import express from 'express';
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct } from '../controllers/productController.js';
import { uploadMiddleware } from '../middlewares/multerMiddleware.js';
const router = express.Router();

router.post('/createProduct', uploadMiddleware, createProduct);

router.get('/allProducts', getProducts);

router.get('/getProduct/:id', getProductById);

router.put('/updateProduct/:id', updateProduct);

router.delete('/deleteProduct/:id', deleteProduct);

export default router;
