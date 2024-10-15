import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import otpGenerator from 'otp-generator';
import User from '../models/userModel.js'; 

dotenv.config({
    path: './.env'
});

const sendVerificationEmail = async (name, email) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });

    try {
        const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);  
        await User.findOneAndUpdate(
            { email: email },
            { otp: otp, otpExpiration: otpExpiration }
        );

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: emailUser,
                pass: emailPassword
            }
        });

        const mailOptions = {
            from: emailUser,
            to: email,
            subject: 'Reset Your Password',
            html: `<p>Hi ${name},</p>
                   <p>Enter the following OTP to reset your password: <strong>${otp}</strong> . It will be expired in 2 minutes.</p>`
        };

        transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
                console.log(err);
            } else {
                console.log('Mail has been sent - ', info.response);
            }
        });
    } catch (error) {
        console.log(error);
    }
}

export default sendVerificationEmail;
