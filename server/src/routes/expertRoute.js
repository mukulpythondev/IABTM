import express from 'express';
const router = express.Router();
import { authenticate } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/multerMiddleware.js';

import { sendOtp , verifyOtp , login , logout , forgetPassword , verifyEmailOtp , updateProfile , postMasterclass, registerExpert, registerWithNo} from '../controllers/expertController.js';

router.post("/register-with-email", upload.single('file'), registerExpert);

router.post("/register-with-number", upload.single('file'), registerWithNo);

router.post("/send-sms-otp", sendOtp);

router.post("/verify-sms-otp" , verifyOtp);

router.get("/logout", logout);

router.post("/login-with-email" , login);

router.post("/forgot-password",forgetPassword)

router.post("/verify-email-otp", verifyEmailOtp)

router.post("/updateProfile" , authenticate , updateProfile);

router.post("/post-masterclass" , authenticate ,upload.single('video') , postMasterclass)


export default router;