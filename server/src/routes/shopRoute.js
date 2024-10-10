import express from 'express';
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct } from '../controllers/productController.js';

const router = express.Router();

router.post('/createProduct', createProduct);

router.get('/allProducts', getProducts);

router.get('/createProduct/:id', getProductById);

router.put('/updateProduct/:id', updateProduct);

router.delete('/deleteproduct/:id', deleteProduct);

export default router;
