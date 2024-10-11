import express from 'express';
const router = express.Router();

import { authenticate } from '../middlewares/authMiddleware.js';

import { getCart ,addToCart , removeFromCart} from '../controllers/cartController.js';

router.post("/add" , authenticate , getCart)

router.get("/get" , authenticate , addToCart)

router.delete("/remove" , authenticate , removeFromCart)


export default router;