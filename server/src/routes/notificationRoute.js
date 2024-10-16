import express from 'express';
const router = express.Router();

import {sendFriendReq , acceptFriendReq , declineFriendReq , newPost , likePost , commentPost , agencyUpdate} from '../controllers/notificationController.js';

import { authenticate } from '../middlewares/authMiddleware.js';

router.post('/friend-requests', authenticate , sendFriendReq );

router.put('/friend-requests/:id/accept',acceptFriendReq );

router.put('/friend-requests/:id/decline', declineFriendReq);

router.post('/posts', newPost);

router.post('/posts/:id/like', likePost);

router.post('/posts/:id/comment', commentPost);

router.post('/agency-updates', agencyUpdate);

export default router