import express from 'express';
const router = express.Router();

import {newPost , likePost , commentPost , agencyUpdate} from '../controllers/notificationController.js';

import { authenticate } from '../middlewares/authMiddleware.js';

router.post('/posts', newPost);

router.post('/posts/:id/like', likePost);

router.post('/posts/:id/comment', commentPost);

router.post('/agency-updates', authenticate, agencyUpdate);

export default router