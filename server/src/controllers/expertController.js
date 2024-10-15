import { ApiResponse } from '../utils/ApiResponse.js';
import Expert from '../models/expertModel.js';
import Otp from '../models/otpModel.js';
import masterclass from '../models/masterClassModel.js';
import ApiError from '../utils/ApiError.js';
import uploadOnCloudinary from '../utils/cloudinary.js';
import User from '../models/userModel.js';
import PendingUser from '../models/pendingUserModel.js';
import validator from 'validator';
import jwt from "jsonwebtoken"
import randomstring from 'randomstring';
import bcrypt from 'bcryptjs'
import otpGenerator from 'otp-generator';
import twilio from 'twilio';
import sendVerificationEmail from '../helpers/sendEmail.js';
// import otpVerification from '../helpers/otpValidate.js';
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const JWT_SECRET = process.env.JWT_SECRET;
const twilioClient = new twilio(accountSid, authToken)

export const postMasterclass = async (req, res) => {
    try {
        const { title, tags } = req.body;
        // const expertId = req.user.id; 

        if (!title || !tags) {
            throw new ApiError(400, 'Title and content are required.');
        }

        if (!req.file) {
            throw new ApiError(400, 'No video file uploaded.');
        }
        // console.log(req.file)
        const filePath = req.file.path;
        // console.log(filePath)
        const result = await uploadOnCloudinary(filePath);

        if (!result) {
            throw new ApiError(500, 'Failed to upload video to Cloudinary.');
        }

        const newMasterclass = new masterclass({
            title,
            tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
            video: result.secure_url
        });

        const savedMasterclass = await newMasterclass.save();

        // await Expert.findByIdAndUpdate(
        //     expertId,
        //     { $push: { masterClasses: savedMasterclass._id } },
        //     { new: true, runValidators: true }
        // );

        res.status(201).json(
            new ApiResponse(201, 'Masterclass created successfully', {
                masterclass: savedMasterclass
            })
        );
    } catch (error) {
        console.error('Error in postMasterclass:', error);
        res.status(error.statusCode || 500).json(
            new ApiError(error.statusCode || 500, error.message)
        );
    }
};

export const verifyExpertEmail = async (req, res) => {
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

            const newExpert = new Expert({
                user: newUser._id
            });

            await newExpert.save();

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

export const verifyExpertNumber = async (req, res) => {
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

        const newExpert = new Expert({
            user: newUser._id
        });

        await newExpert.save();

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

export const updateExpertProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const updates = {};

        const allowedUpdates = ['name', 'profileName', 'age', 'gender', 'email', 'phone', 'expertTag'];

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

