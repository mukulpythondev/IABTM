import { ApiResponse } from '../utils/ApiResponse.js';
import Expert from '../models/expertModel.js';
import Otp from '../models/otpModel.js';
import masterclass from '../models/masterClassModel.js';
import ApiError from '../utils/ApiError.js';
import uploadOnCloudinary from '../utils/cloudinary.js';
import User from '../models/userModel.js';
import pendingUser from '../models/pendingUserModel.js';
import validator from 'validator';
import jwt from "jsonwebtoken"
import randomstring from 'randomstring';
import bcrypt from 'bcryptjs'
import otpGenerator from 'otp-generator';
import twilio from 'twilio';
import sendResetEmail from '../helpers/sendEmail.js';
import otpVerification from '../helpers/otpValidate.js';
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
        console.log(req.file)
        const filePath = req.file.path;
        console.log(filePath)
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

export const registerExpert = async (req, res) => {
    const { name, email, password } = req.body;
    const filepath = req?.file?.path;

    // Validate input fields
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
        // Check if the user already exists in the User model
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json(new ApiResponse(400, {}, "User already exists"));
        }

        // Upload profile picture to Cloudinary
        const result = await uploadOnCloudinary(filepath);

        // Create new user with the user registration logic
        const newUser = new User({
            name,
            email,
            password,
            profilePicture: result.secure_url
        });

        await newUser.save();

        // // Check if the expert already exists in the Expert model
        // const existingUser = await Expert.findOne({ email });
        // if (existingExpert) {
        //     throw new ApiError(400, "Expert already exists");
        // }

        // Create new expert entry with extra expert-specific properties
        const newExpert = new Expert({
            user: newUser._id,    // Reference to the new user created
            // Array of expert tags
        });

        await newExpert.save();

        // Generate JWT token for the new expert
        const token = jwt.sign({ id: newExpert._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        // Set the token as a cookie
        res.cookie("token", token, { httpOnly: true });

        // Respond with success and the new expert data
        return res.status(201).json(new ApiResponse(201, newExpert, "Expert registered successfully"));

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

        const newExpert = new Expert({
            user: newUser._id
        });

        await newExpert.save();


        await pendingUser.findOneAndDelete({ phoneNumber });

        const token = jwt.sign({ id: newUser._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000 
        });

        return res.status(200).json(new ApiResponse(200, null, 'Expert registered and OTP verified successfully!'));

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

        const isUser = await User.findOne({ email });
        if (!isUser) {
            res.status(400).json(new ApiResponse(404, {}, "User not  found"));
        }
        const isExpert = await Expert.findOne({ user: isUser._id })
        if (!isExpert) {
            res.status(400).json(new ApiResponse(404, {}, "Expert not  found"));
        }
        const isMatch = bcrypt.compare(password, isUser.password);
        if (!isMatch) {
            throw new ApiError(400, "Invalid credentials");
        }

        const token = jwt.sign({ id: isUser._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000
        });

        return res.status(200).json(new ApiResponse(200, { name: isUser.name, email: isUser.email }, "Logged in successfully"));

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

export const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const isUser = await User.findOne({ email });

        if (!isUser) {
            throw new ApiError(404, "Expert not found");
        }

        if (isUser.otp !== otp) {
            throw new ApiError(400, "Invalid OTP");
        }

        const currentTime = new Date();
        if (currentTime > isUser.otpExpiration) {
            res.status(400).json(new ApiResponse(400, {}, "OTP has expired"));
        }

        isUser.password = newPassword;
        isUser.otp = '';
        isUser.otpExpiration = null;
        console.log("New password:", newPassword);
        await isUser.save();
        console.log('Password updated successfully for Expert:', isUser.email);

        return res.status(200).json(new ApiResponse(200, null, "Password updated successfully"));
    } catch (error) {
        console.error('Error saving the new password:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const updateProfile = async (req, res) => {
    try {
        const ExpertId = req.user.id;

        const updates = {};
        const allowedUpdates = ['name', 'profileName', 'age', 'gender', 'email', 'phone'];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (req.body.expertTag !== undefined) {
            if (req.body.expertTag === null || (Array.isArray(req.body.expertTag) && req.body.expertTag.length === 0)) {
                updates.expertTag = [];
            }
            else if (Array.isArray(req.body.expertTag)) {
                updates.expertTag = req.body.expertTag;
            }
            else if (typeof req.body.expertTag === 'string') {
                updates.expertTag = [req.body.expertTag];
            }
        }

        const updatedExpert = await Expert.findByIdAndUpdate(ExpertId, updates, {
            new: true,
            runValidators: true
        });

        if (!updatedExpert) {
            throw new ApiError(404, "Expert not found");
        }

        return res.status(200).json(new ApiResponse(200, updatedExpert, "Profile updated successfully"));
    }
    catch (error) {
        console.error('Error updating profile:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

