import express from 'express';
const router = express.Router();

import {createComment , getCommentsByPost ,  updateComment , deleteComment} from '../controllers/notificationController.js';

import { authenticate } from '../middlewares/authMiddleware.js';

router.post('/create', authenticate , createComment);

router.post('/get', getCommentsByPost);

router.post('/edit/:id', authenticate , updateComment);

router.get('/delete/:id', authenticate ,  deleteComment);

export default router