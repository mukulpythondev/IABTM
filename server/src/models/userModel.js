import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    dob: {
        type: Date,
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        validate: {
            validator: function (v) {
                return v === null || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`,
        }
    },
    password: {
        type: String,
        minlength: 6,
    },
    profile: {
        type: String,
        default: "",
    },
    otp: {
        type: String,
        require: true
    },
    otpExpiration: {
        type: Date,
        default: () => new Date(Date.now() + 2 * 60 * 1000),  
    }
}, { timestamps: true });

// Middleware to hash the password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);

export default User;
