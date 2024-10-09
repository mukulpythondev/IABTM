import express from 'express';
const router = express.Router();

import { upload } from '../middlewares/multerMiddleware.js';
import { postMasterclass } from '../controllers/expertController.js';

router.post('/masterclass', upload.single('video'), postMasterclass);


export default router;