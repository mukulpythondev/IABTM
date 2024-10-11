import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const expertSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, ref: 'user',
        required: true
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

const Expert = mongoose.model('Expert', expertSchema);

export default Expert;
