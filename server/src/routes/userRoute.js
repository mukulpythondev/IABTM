import express from 'express';
const router = express.Router();

import { register , sendOtp , verifyOtp , login , logout , forgetPassword , verifyEmailOtp , updateProfile} from '../controllers/userController.js';

import { authenticate } from '../middlewares/authMiddleware.js';
import {upload} from '../middlewares/multerMiddleware.js'

router.post("/register-with-email", upload.single('file') , register);

router.post("/send-sms-otp", sendOtp);

router.post("/verify-sms-otp" , verifyOtp);

router.get("/logout", logout);

router.post("/login-with-email" , login);

router.post("/forgot-password",forgetPassword)

router.post("/verify-email-otp", verifyEmailOtp)

router.post("/updateProfile" , authenticate , updateProfile)


export default router;
