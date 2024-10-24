import express from 'express';
const router = express.Router();

import { authenticate } from '../middlewares/authMiddleware.js';

import { getCart ,addToCart , removeFromCart} from '../controllers/cartController.js';

router.post("/add" , authenticate , addToCart)

router.get("/get" , authenticate , getCart)

router.delete("/remove" , authenticate , removeFromCart)


export default router;