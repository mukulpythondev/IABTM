import express from 'express';
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct } from '../controllers/productController.js';
const router = express.Router();
import { upload } from '../middlewares/multerMiddleware.js';
const uploadFields = upload.array('productImages', 4);

router.post('/createProduct', uploadFields, createProduct);

router.get('/allProducts', getProducts);

router.get('/getProduct/:id', getProductById);

router.put('/updateProduct/:id', updateProduct);

router.delete('/deleteProduct/:id', deleteProduct);

export default router;
