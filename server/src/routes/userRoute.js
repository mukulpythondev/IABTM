import express from 'express';
const router = express.Router();

import { register , sendOtp , verifyOtp , login , logout , forgetPassword , verifyEmailOtp} from '../controllers/userController.js';

router.post("/register-with-email", register);

router.post("/send-sms-otp", sendOtp);

router.post("/verify-sms-otp" , verifyOtp);

router.get("/logout", logout);

router.post("/login-with-email" , login);

router.post("/forgot-password",forgetPassword)

router.post("/verify-email-otp", verifyEmailOtp)

export default router;
