import express from 'express';
const router = express.Router();

import { registerUserWithMail, registerUserWithNumber , verifyUserNumber, updateUserProfile, loginUserWithMail, loginUserWithNumber, logout, forgetPassword, verifyUserEmail , resetPassword} from '../controllers/userController.js';

import { authenticate } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/multerMiddleware.js'

router.post("/register-user-with-email", upload.single('file'), registerUserWithMail);

router.post("/register-user-with-number", upload.single('file'), registerUserWithNumber);

router.post("/verify-user-number", verifyUserNumber);

router.get("/logout", logout);

router.post("/login-user-with-email", loginUserWithMail);

router.post("/login-user-with-number", loginUserWithNumber);

router.post("/verify-user-email", verifyUserEmail)

router.post("/forgot-user-password", forgetPassword);

router.post("/reset-user-password", resetPassword)

router.post("/update-expert-profile", authenticate, updateUserProfile)


export default router;
