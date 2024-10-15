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
import sendVerificationEmail from '../helpers/sendEmail.js'
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import uploadOnCloudinary from '../utils/cloudinary.js';
import PendingUser from '../models/pendingUserModel.js';
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const JWT_SECRET = process.env.JWT_SECRET;

const twilioClient = new twilio(accountSid, authToken)

export const loginUserWithMail = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            throw new ApiError(400, "Email and password are required.");
        }

        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new ApiError(400, "Invalid password");
        }

        if (user.twoFA) {
            const otp = randomstring.generate({ length: 6, charset: 'numeric' });
            const otpExpiration = new Date(Date.now() + 10 * 60 * 1000);

            user.otp = otp;
            user.otpExpiration = otpExpiration;
            await user.save();

            await sendVerificationEmail(user.name, user.email, otp);

            return res.json(new ApiResponse(200, null, "OTP sent to your email. Please verify to complete login."));
        }

        const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "12h" });
        res.cookie("token", token, { httpOnly: true });

        return res.json(new ApiResponse(200, null, "Login successful."));
    } catch (error) {
        console.error("Error during login with email:", error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const registerUserWithNumber = async (req, res) => {
    const { name, phoneNumber, password } = req.body;
    const filepath = req?.file?.path;

    if (!name || !phoneNumber || !password || !filepath) {
        throw new ApiError(400, "All fields are required: name, phone number, password, and profile picture.");
    }

    try {
        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) {
            throw new ApiError(400, "User with this phone number already exists.");
        }

        const otpResult = await sendNumberOtp(req, res);
        if (otpResult.success) {
            const newPendingUser = new PendingUser({
                name,
                phoneNumber,
                password,
                filepath
            });
            await newPendingUser.save();

            return res.json(new ApiResponse(200, null, "OTP sent successfully. Please verify your phone number to complete registration."));
        }
    } catch (error) {
        console.error("Error during registration:", error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const registerUserWithMail = async (req, res) => {
    const { name, email, password } = req.body;
    const filepath = req?.file?.path;

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

        const otp = randomstring.generate({ length: 6, charset: 'numeric' });
        const otpExpiration = new Date(Date.now() + 10 * 60 * 1000);

        const newPendingUser = new PendingUser({
            name,
            email,
            password,
            filepath,
            otp,
            otpExpiration
        });

        await newPendingUser.save();
        await sendVerificationEmail(name, email, otp);

        return res.json(new ApiResponse(200, null, "OTP sent to your email. Please verify your email to complete registration."));
    } catch (error) {
        console.error("Error during registration with email:", error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const loginUserWithNumber = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        if (!phoneNumber || !password) {
            throw new ApiError(400, "Phone number and password are required.");
        }

        const user = await User.findOne({ phoneNumber });
        if (!user) {
            throw new ApiError(404, "User not found with this phone number.");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new ApiError(400, "Incorrect password.");
        }

        if (user.twoFA) {
            await sendNumberOtp(req, res);
            return res.json(new ApiResponse(200, null, "OTP sent successfully. Please verify to complete login."));
        }

        const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 12 * 60 * 60 * 1000 // 12 hours
        });

        return res.json(new ApiResponse(200, null, "Login successful."));
    } catch (error) {
        console.error("Error during login with number:", error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const sendNumberOtp = async (req, res) => {
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
                    otpExpiration: new Date(cDate.getTime() + 5 * 60 * 1000) 
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await twilioClient.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });

        return { success: true };

    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};

export const verifyUserNumber = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            throw new ApiError(400, "Phone number and OTP are required");
        }

        const otpData = await Otp.findOne({ phoneNumber, otp });
        if (!otpData) {
            throw new ApiError(404, "You entered wrong OTP");
        }

        const isOtpExpired = await otpVerification(otpData.otpExpiration);
        if (isOtpExpired) {
            throw new ApiError(400, "Your OTP has expired");
        }

        const user = await User.findOne({ phoneNumber });
        if (user) {
            user.otp = null;
            user.otpExpiration = null;
            await user.save();

            const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "12h" });
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 12 * 60 * 60 * 1000
            });

            return res.json(new ApiResponse(200, user, 'Login successful'));
        }

        const pendingUserData = await PendingUser.findOne({ phoneNumber });
        if (!pendingUserData) {
            throw new ApiError(400, "No pending user data found. Please restart the registration process.");
        }

        const { name, password, filepath } = pendingUserData;

        if (!name || !phoneNumber || !password || !filepath) {
            throw new ApiError(400, "Missing data required for registration after OTP verification");
        }

        const result = await uploadOnCloudinary(filepath);

        const newUser = new User({
            name,
            phoneNumber,
            password,
            profilePicture: result.secure_url,
            twoFA: true
        });

        await newUser.save();

        await PendingUser.findOneAndDelete({ phoneNumber });

        const token = jwt.sign({ id: newUser._id.toString() }, JWT_SECRET, { expiresIn: "12h" });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000
        });

        return res.json(new ApiResponse(200, newUser, "User registered and OTP verified successfully"));

    } catch (error) {
        console.error('Error verifying OTP:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const sendEmailOtp = async (req, res) => {
    try {
        const email = req.body.email;
        const userData = await User.findOne({ email: email });

        if (userData) {
            const randomString = randomstring.generate();
            await User.updateOne({ email: email }, { $set: { token: randomString } });
            await sendVerificationEmail(userData.name, userData.email, randomString);

            return res.status(200).json(new ApiResponse(200, null, "Please check your email to verify it."));
        }

        throw new ApiError(404, "This email does not exist");
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const verifyUserEmail = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required");
    }

    try {
        const user = await User.findOne({ email });

        if (user) {
            const currentTime = new Date();
            if (otp !== user.otp || currentTime > user.otpExpiration) {
                throw new ApiError(400, "Invalid or expired OTP");
            }

            user.otp = null;
            user.otpExpiration = null;
            await user.save();

            const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "12h" });
            res.cookie("token", token, { httpOnly: true });

            return res.json(new ApiResponse(200, user, "Login successful"));
        } else {
            const pendingUser = await PendingUser.findOne({ email });

            if (!pendingUser) {
                throw new ApiError(404, "Pending registration not found");
            }

            const currentTime = new Date();
            if (otp !== pendingUser.otp || currentTime > pendingUser.otpExpiration) {
                throw new ApiError(400, "Invalid or expired OTP");
            }

            const result = await uploadOnCloudinary(pendingUser.filepath);

            const newUser = new User({
                name: pendingUser.name,
                email: pendingUser.email,
                password: pendingUser.password,
                profilePicture: result.secure_url,
                twoFA: true
            });

            await newUser.save();

            await PendingUser.deleteOne({ email });

            const token = jwt.sign({ id: newUser._id.toString() }, JWT_SECRET, { expiresIn: "12h" });
            res.cookie("token", token, { httpOnly: true });

            return res.json(new ApiResponse(201, newUser, "User registered and logged in successfully"));
        }

    } catch (error) {
        console.error('Error in OTP verification and user processing:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const isUser = await User.findOne({ email })
        if (!isUser) {
            res.status(400).json(new ApiResponse(404, {}, "User not  found"));
        }
        const isExpert = await Expert.findOne({ user: isUser._id })
        if (!isExpert) {
            res.status(400).json(new ApiResponse(404, {}, "Expert not  found"));
        }
        const randomString = randomstring.generate();
        await User.updateOne({ email: email }, { $set: { token: randomString } });
        await sendResetEmail(isUser.name, isUser.email, randomString);
        return res.status(200).json(new ApiResponse(200, null, "Please check your email to reset your password"));

    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const resetPassword = async (req, res) => {
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

export const logout = (req, res) => {
    res.clearCookie("token");
    return res.json(new ApiResponse(200, null, "Logged out successfully"));
};

export const updateUserProfile = async (req, res) => {
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

