// import dotenv from "dotenv"
// dotenv.config({
//     path: "./.env"
// })

import jwt from 'jsonwebtoken';
import validator from 'validator';
import User from '../models/userModel.js';
import Otp from '../models/otpModel.js';
import bcrypt from 'bcryptjs'
import randomstring from 'randomstring';
import otpGenerator from 'otp-generator';
import twilio from 'twilio';
import otpVerification from '../helpers/otpValidate.js';
import sendResetEmail from '../helpers/sendEmail.js'
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import uploadOnCloudinary from '../utils/cloudinary.js';
import pendingUser from '../models/pendingUserModel.js';
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const JWT_SECRET = process.env.JWT_SECRET;

const twilioClient = new twilio(accountSid, authToken)

export const register = async (req, res) => {
    const { name, email, password } = req.body;
    const filepath = req?.file?.path
    console.log(filepath)

    if (!name || !email || !password || !filepath) {
        throw new ApiError(400, "All fields and a profile picture are required");
    }

    if (!validator.isEmail(email)) {
        throw new ApiError(400, "Invalid email address");
    }

    if (password.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters long");
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new ApiError(400, "User already exists");
        }

        const result = await uploadOnCloudinary(filepath)

        const newUser = new User({
            name,
            email,
            password,
            profilePicture: result.secure_url
        });

        await newUser.save({ validationBeforeSave: false });

        const token = jwt.sign({ id: newUser._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        res.cookie("token", token, { httpOnly: true });
        return res.status(201).json(new ApiResponse(201, newUser, "User registered successfully"));

    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};

export const registerWithNo = async (req, res) => {
    const { name, phoneNumber, password } = req.body;
    const filepath = req?.file?.path;

    if (!name || !phoneNumber || !password || !filepath) {
        return res.status(400).json({ error: 'All fields are required: name, phone number, password, and profile picture.' });
    }

    try {
        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this phone number already exists.' });
        }

        const otpResult = await sendOtp(req, res);

        if (otpResult.success) {
            const newPendingUser = new pendingUser({
                name,
                phoneNumber,
                password,
                filepath
            })
            await newPendingUser.save()

            return res.status(200).json({
                message: 'OTP sent successfully. Please verify your phone number to complete registration.'
            });
        }

    } catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

export const sendOtp = async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        throw new ApiError(400, "Phone number is required");
    }

    try {
        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) {
            throw new ApiError(400, "User with this phone number already exists");
        }

        const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
        const cDate = new Date();

        await Otp.findOneAndUpdate(
            { phoneNumber },
            {
                $set: {
                    otp,
                    otpExpiration: new Date(cDate.getTime() + 5 * 60 * 1000) // 5 minutes expiration
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await twilioClient.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });

        // No response here, just return success or data
        return { success: true };

    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        const otpData = await Otp.findOne({ phoneNumber, otp });
        if (!otpData) {
            throw new ApiError(404, "You entered wrong OTP");
        }

        const isOtpExpired = await otpVerification(otpData.otpExpiration);
        if (isOtpExpired) {
            return res.status(400).json(new ApiResponse(400, null, 'Your OTP has expired.'));
        }

        const pendingUserData = await pendingUser.findOne({ phoneNumber });
        if (!pendingUserData) {
            throw new ApiError(400, 'No pending user data found. Please restart the registration process.');
        }

        const { name, password, filepath } = pendingUserData;
        
        if (!name || !phoneNumber || !password || !filepath) {
            throw new ApiError(400, 'Missing data required for registration after OTP verification.');
        }

        const result = await uploadOnCloudinary(filepath);

        const newUser = new User({
            name,
            phoneNumber,
            password,
            profilePicture: result.secure_url
        });

        await newUser.save();

        await pendingUser.findOneAndDelete({ phoneNumber });

        const token = jwt.sign({ id: newUser._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000 
        });

        return res.status(200).json(new ApiResponse(200, null, 'User registered and OTP verified successfully!'));

    } catch (error) {
        console.error('Error verifying OTP:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new ApiError(400, "Email and password are required");
        }

        const user = await User.findOne({ email });
        if (!user) {
            res.status(400).json(new ApiResponse(400, {}, "User not found"));
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new ApiError(400, "Invalid credentials");
        }

        const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000
        });

        return res.status(200).json(new ApiResponse(200, { name: user.name, email: user.email }, "Logged in successfully"));

    } catch (error) {
        console.error("Login error:", error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const logout = (req, res) => {
    res.clearCookie("token");
    return res.json(new ApiResponse(200, null, "Logged out successfully"));
};

export const forgetPassword = async (req, res) => {
    try {
        const email = req.body.email;
        const userData = await User.findOne({ email: email });

        if (userData) {
            const randomString = randomstring.generate();
            await User.updateOne({ email: email }, { $set: { token: randomString } });
            await sendResetEmail(userData.name, userData.email, randomString);

            return res.status(200).json(new ApiResponse(200, null, "Please check your email to reset your password"));
        }

        throw new ApiError(404, "This email does not exist");
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const userData = await User.findOne({ email });

        if (!userData) {
            throw new ApiError(404, "User not found");
        }

        if (userData.otp !== otp) {
            throw new ApiError(400, "Invalid OTP");
        }

        const currentTime = new Date();
        if (currentTime > userData.otpExpiration) {
            throw new ApiError(400, "OTP has expired");
        }

        userData.password = newPassword;
        userData.otp = '';
        userData.otpExpiration = null;
        console.log("New password:", newPassword);
        await userData.save();
        console.log('Password updated successfully for user:', userData.email);

        return res.status(200).json(new ApiResponse(200, null, "Password updated successfully"));
    } catch (error) {
        console.error('Error saving the new password:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const updates = {};
        const allowedUpdates = ['name', 'profileName', 'age', 'gender', 'email', 'phone'];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const updatedUser = await User.findByIdAndUpdate(userId, updates, {
            new: true,
            runValidators: true
        });

        if (!updatedUser) {
            throw new ApiError(404, "User not found");
        }

        return res.status(200).json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
    }
    catch (error) {
        console.error('Error updating profile:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

