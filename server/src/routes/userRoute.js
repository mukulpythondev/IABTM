import express from 'express';
const router = express.Router();

import { register , sendOtp , verifyOtp , login , logout } from '../controllers/userController.js';

router.post("/register-with-email", register);

router.post("/send-otp", sendOtp);

router.post("/verify-otp" , verifyOtp);

router.get("/logout", logout);

router.post("/login" , login);

export default router;
