import express from 'express';
const router = express.Router();
import { authenticate } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/multerMiddleware.js';

import { verifyExpertNumber , verifyExpertEmail , postMasterclass , updateExpertProfile} from '../controllers/expertController.js';

import { registerUserWithNumber , forgetPassword , resetPassword , registerUserWithMail , logout , loginUserWithMail , loginUserWithNumber} from '../controllers/userController.js';

router.post("/post-masterclass" , authenticate ,upload.single('video') , postMasterclass)

router.post("/register-expert-with-email", upload.single('file'), registerUserWithMail);

router.post("/register-expert-with-number", upload.single('file'), registerUserWithNumber);

router.post("/verify-expert-number", verifyExpertNumber);

router.get("/logout", logout);

router.post("/login-expert-with-email", loginUserWithMail);

router.post("/login-expert-with-number", loginUserWithNumber);

router.post("/verify-expert-email", verifyExpertEmail)

router.post("/forgot-expert-password", forgetPassword);

router.post("/reset-expert-password", resetPassword)

router.post("/update-user-profile", authenticate, updateExpertProfile)

export default router;