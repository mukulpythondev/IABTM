import { ApiResponse } from '../utils/ApiResponse.js';
import Expert from '../models/expertModel.js';
import Otp from '../models/otpModel.js';
import Masterclass from '../models/masterClassModel.js';
import ApiError from '../utils/ApiError.js';
import uploadOnCloudinary from '../utils/cloudinary.js';
import User from '../models/userModel.js';
import PendingUser from '../models/pendingUserModel.js';
import moment from "moment";
import jwt from "jsonwebtoken"


const JWT_SECRET = process.env.JWT_SECRET;


export const postMasterclass = async (req, res) => {
    try {
        const { title, tags } = req.body;
        const expertId = req.user.id;

        if (!title || !tags) {
            return res.status(200).json(new ApiResponse(400, 'Title and content are required.'));
        }

        if (!req.file) {
            return res.status(200).json(new ApiResponse(400, 'No video file uploaded.'));
        }

        const filePath = req.file.path;

        const result = await uploadOnCloudinary(filePath);

        if (!result) {
            throw new ApiError(500, 'Failed to upload video to Cloudinary.');
        }

        const expert = await Expert.findOne({ user: expertId })
        console.log(expert)
        const newMasterclass = new Masterclass({
            expert: expert._id,
            title,
            tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
            video: result.secure_url
        });

        const savedMasterclass = await newMasterclass.save();

        await Expert.findOneAndUpdate(
            { user: expertId },
            { $push: { masterclasses: savedMasterclass._id } },
            { new: true, runValidators: true }
        );

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
        return res.status(200).json(new ApiResponse(400, "Email and OTP are required"));
    }

    try {
        const user = await User.findOne({ email });

        if (user) {
            const pendingOtp = await Otp.findOne({ email });

            const currentTime = new Date();
            const otpExpirationDate = new Date(pendingOtp.otpExpiration);
            if (String(otp) !== String(pendingOtp.otp) || currentTime.getTime() > otpExpirationDate.getTime()) {
                return res.status(200).json(new ApiResponse(400, "Invalid or expired OTP"));
            }

            await Otp.findOneAndDelete({ email })

            const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "12h" });
            res.cookie("token", token, { httpOnly: true });

            return res.json(new ApiResponse(200, user, "Login successful"));
        } else {
            const pendingUser = await PendingUser.findOne({ email });

            if (!pendingUser) {
                return res.status(200).json(new ApiResponse(400, "Pending registration not found"));
            }

            const currentTime = new Date();
            const otpExpirationDate = new Date(pendingUser.otpExpiration);

            if (String(otp) !== String(pendingUser.otp) || currentTime.getTime() > otpExpirationDate.getTime()) {
                return res.status(200).json(new ApiResponse(400, "Invalid or expired OTP"));
            }

            const result = await uploadOnCloudinary(pendingUser.filepath);
            console.log(result)
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

            return res.json(new ApiResponse(201, newUser, "Expert registered and logged in successfully"));
        }

    } catch (error) {
        console.error('Error in OTP verification and user processing:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const verifyExpertNumber = async (req, res) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return res.status(200).json(new ApiResponse(400, "PhoneNumber and OTP are required"));
    }

    try {
        const user = await User.findOne({ phoneNumber });

        if (user) {
            const pendingOtp = await Otp.findOne({ phoneNumber });

            const currentTime = new Date();
            const otpExpirationDate = new Date(pendingOtp.otpExpiration);
            if (String(otp) !== String(pendingOtp.otp) || currentTime.getTime() > otpExpirationDate.getTime()) {
                return res.status(200).json(new ApiResponse(400, "Invalid or expired OTP"));
            }

            await Otp.findOneAndDelete({ phoneNumber })

            const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "12h" });
            res.cookie("token", token, { httpOnly: true });

            return res.json(new ApiResponse(200, user, "Login successful"));
        } else {
            const pendingUser = await PendingUser.findOne({ phoneNumber });

            if (!pendingUser) {
                return res.status(200).json(new ApiResponse(400, "Pending registration not found"));
            }

            const currentTime = new Date();
            const otpExpirationDate = new Date(pendingUser.otpExpiration);

            if (String(otp) !== String(pendingUser.otp) || currentTime.getTime() > otpExpirationDate.getTime()) {
                return res.status(200).json(new ApiResponse(400, "Invalid or expired OTP"));
            }

            const result = await uploadOnCloudinary(pendingUser.filepath);

            const newUser = new User({
                name: pendingUser.name,
                phoneNumber: pendingUser.phoneNumber,
                password: pendingUser.password,
                profilePicture: result.secure_url,
                twoFA: true
            });

            await newUser.save();

            const newExpert = new Expert({
                user: newUser._id
            });

            await newExpert.save();

            await PendingUser.deleteOne({ phoneNumber });

            const token = jwt.sign({ id: newUser._id.toString() }, JWT_SECRET, { expiresIn: "12h" });
            res.cookie("token", token, { httpOnly: true });

            return res.json(new ApiResponse(201, newUser, "Expert registered and logged in successfully"));
        }

    } catch (error) {
        console.error('Error verifying OTP:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const updateExpertProfile = async (req, res) => {
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
            return res.status(200).json(new ApiResponse(400, "User not found"));
        }

        if (req.body.expertTag) {

            await Expert.findOneAndUpdate(
                { user: userId },
                { expertTag: req.body.expertTag },
                { new: true, runValidators: true }
            );
        }

        return res.status(200).json(new ApiResponse(200, "Expert Profile updated successfully"));
    } catch (error) {
        console.error('Error updating profile:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const trackMasterclassView = async (req, res) => {
    try {
        const { masterclassId } = req.body;
        const userId = req.user.id;

        const masterclass = await Masterclass.findById(masterclassId)
            .populate({
                path: 'expert',
                populate: {
                    path: 'user',
                    model: 'User'
                }
            });

        if (!masterclass) {
            return res.status(200).json(new ApiResponse(400, 'Masterclass not found'));
        }

        if (masterclass.expert.user._id.toString() === userId.toString()) {
            return res.status(200).json(new ApiResponse(400, 'Creator cannot be counted as a viewer'));
        }

        const alreadyViewed = masterclass.viewedBy.includes(userId);

        if (!alreadyViewed) {
            masterclass.viewedBy.push(userId);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (!masterclass.views.length) {
                masterclass.views = [
                    { count: 1 },
                    { dateViewed: today }
                ];
            } else {
                masterclass.views = [
                    { count: (masterclass.views[0]?.count || 0) + 1 },
                    { dateViewed: today }
                ];
            }

            console.log('Before save - views array:', masterclass.views);

            const updatedMasterclass = await masterclass.save();

            console.log('After save - views array:', updatedMasterclass.views);

            return res.status(200).json(new ApiResponse(200, {
                totalViews: updatedMasterclass.views[0].count,
                viewDate: updatedMasterclass.views[1].dateViewed
            }, 'View tracked successfully'));
        }
        return res.status(200).json(new ApiResponse(200, {
            totalViews: masterclass.views[0]?.count || 0
        }, 'Already viewed by this user'));

    } catch (error) {
        console.error('Error tracking masterclass view:', error);
        throw new ApiError(500, "Error tracking masterclass view", [error.message]);
    }
};

export const getMasterclassViews = async (req, res) => {
    try {
        const { masterclassId } = req.body;

        const masterclass = await Masterclass.findById(masterclassId)
            .populate('viewedBy', 'name email');

        if (!masterclass) {
            return res.status(200).json(new ApiResponse(400, 'Masterclass not found'));
        }
        return res.status(200).json(new ApiResponse(200, {
            totalViews: masterclass.views[0]?.count || 0,
            lastViewDate: masterclass.views[1]?.dateViewed,
            uniqueViewers: masterclass.viewedBy.length,
            viewers: masterclass.viewedBy
        }, 'View tracked successfully'));
   

    } catch (error) {
        console.error('Error fetching view statistics:', error);
        throw new ApiError(500, "Error fetching view statistics", [error.message]);
    }
};

