import { ApiResponse } from '../utils/ApiResponse.js';
import Expert from '../models/expertModel.js';
import Otp from '../models/otpModel.js';
import masterclass from '../models/masterClass.js';
import ApiError from '../utils/ApiError.js';
import uploadOnCloudinary from '../utils/cloudinary.js';

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
            content: result.secure_url
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
        const existingExpert = await Expert.findOne({ email });
        if (existingExpert) {
            throw new ApiError(400, "Expert already exists");
        }

        const result = await uploadOnCloudinary(filepath)

        const newExpert = new Expert({
            name,
            email,
            password,
            profilePicture: result.secure_url
        });

        await newExpert.save({ validationBeforeSave: false });

        const token = jwt.sign({ id: newExpert._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        res.cookie("token", token, { httpOnly: true });
        return res.status(201).json(new ApiResponse(201, newExpert, "Expert registered successfully"));

    } catch (err) {
        console.error(err);
        throw new ApiError(500, "Internal server error", [err.message]);
    }
};

export const sendOtp = async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        throw new ApiError(400, "Phone number is required");
    }

    try {
        const existingExpert = await Expert.findOne({ phoneNumber });
        if (existingExpert) {
            throw new ApiError(400, "Expert with this phone number already exists");
        }

        const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
        const cDate = new Date();

        await Otp.findOneAndUpdate(
            { phoneNumber },
            {
                $set: {
                    otp,
                    otpExpiration: new Date(cDate.getTime() + 5 * 60 * 1000) // Set expiration (e.g., 5 minutes)
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        await twilioClient.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });

        return res.status(200).json(new ApiResponse(200, null, 'OTP sent successfully'));

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

        const token = jwt.sign({ id: otpData._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000
        });

        return res.status(200).json(new ApiResponse(200, null, 'OTP Verified successfully!'));

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

        const Expert = await Expert.findOne({ email });
        if (!Expert) {
            throw new ApiError(400, "Expert not found");
        }

        const isMatch = await bcrypt.compare(password, Expert.password);
        if (!isMatch) {
            throw new ApiError(400, "Invalid credentials");
        }

        const token = jwt.sign({ id: Expert._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000
        });

        return res.status(200).json(new ApiResponse(200, { name: Expert.name, email: Expert.email }, "Logged in successfully"));

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
        const ExpertData = await Expert.findOne({ email: email });

        if (ExpertData) {
            const randomString = randomstring.generate();
            await Expert.updateOne({ email: email }, { $set: { token: randomString } });
            await sendResetEmail(ExpertData.name, ExpertData.email, randomString);

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

        const ExpertData = await Expert.findOne({ email });

        if (!ExpertData) {
            throw new ApiError(404, "Expert not found");
        }

        if (ExpertData.otp !== otp) {
            throw new ApiError(400, "Invalid OTP");
        }

        const currentTime = new Date();
        if (currentTime > ExpertData.otpExpiration) {
            throw new ApiError(400, "OTP has expired");
        }

        ExpertData.password = newPassword;
        ExpertData.otp = '';
        ExpertData.otpExpiration = null;
        console.log("New password:", newPassword);
        await ExpertData.save();
        console.log('Password updated successfully for Expert:', ExpertData.email);

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

