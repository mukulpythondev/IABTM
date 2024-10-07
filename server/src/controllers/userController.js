import jwt from 'jsonwebtoken';
import validator from 'validator';
import User from '../models/userModel.js';
import Otp from '../models/otpModel.js';
import bcrypt from 'bcryptjs'
// import randomstring from 'randomstring';
import otpGenerator from 'otp-generator';
import twilio from 'twilio';
import otpVerification from '../helpers/otpValidate.js';
// import sendResetEmail from '../helpers/sendEmail.js'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const JWT_SECRET = process.env.JWT_SECRET;
const twilioClient = new twilio(accountSid, authToken) 

export const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Invalid email address" });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const newUser = new User({ name, email, password });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        res.cookie("token", token, { httpOnly: true });
        res.status(201).json({ message: "User registered successfully" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
};

export const sendOtp = async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
    }

    // if (!/^\d{10}$/.test(phoneNumber)) {
    //   return res.status(400).json({ message: "Invalid phone number format" });
    // }

    try {
        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) {
            return res.status(400).json({ message: "User with this phone number already exists" });
        }

        const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });

        const cDate = new Date()

        await Otp.findOneAndUpdate(
            { phoneNumber },
            {
                $set: {
                    otp,
                    otpExpiration: new Date(cDate.getTime())
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        )
            .then((result) => {
                console.log(result);
            })
            .catch((err) => {
                console.error(err);
            });


        twilioClient.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });

        return res.status(200).json({
            success: true,
            msg: 'otp sent successfully - ' + otp
        })

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;
        const otpData = await Otp.findOne({ phoneNumber, otp })
        if (!otpData) {
            res.status(404).json({ message: "You entered wrong OTP" });
        }

        const isOtpExpired = await otpVerification(otpData.otpExpiration);

        console.log(isOtpExpired);

        if (isOtpExpired) {
            return res.status(200).json({
                success: false,
                msg: 'Your OTP has been expired.'
            })
        }

        const token = jwt.sign({ id: otpData._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        res.cookie('token', token, {
            httpOnly: true
        });

        return res.status(200).json({
            success: true,
            msg: 'OTP Verified successfully !!'
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "12h" });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000
        });

        console.log('Cookie set:', res.getHeader('Set-Cookie'));

        res.status(200).json({ message: "Logged in successfully", user: { name: user.name, email: user.email } });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const logout = (req, res) => {
    res.clearCookie("token");
    res.json({ message: "logged-out" });
};
