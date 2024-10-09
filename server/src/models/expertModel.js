import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const expertSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    dob: {
        type: Date,
    },
    age: {
        type: Number,
        min: [1, 'Age must be greater than 0'],
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },
    phone: {
        type: Number,
        required: true,
        maxlength: 10
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
    profileName: {
        type: String,
        required: true,
        trim: true,
    },
    otp: {
        type: String,
        require: true
    },
    otpExpiration: {
        type: Date,
        default: () => new Date(Date.now() + 5 * 60 * 1000),
    },
    masterclasses: [
        {
            type: mongoose.Schema.Types.ObjectId, ref: 'masterclass'
        }
    ],
    expertTag: [
        {
            type: String
        }
    ]
}, { timestamps: true });

// Middleware to hash the password before saving
expertSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const expert = mongoose.model('expert', expertSchema);

export default expert;
