import mongoose from 'mongoose';

const pendingUserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    phoneNumber: {
        type: String,
        required: true
    },
    password: {
        type: String,
        minlength: 6,
        required: true,
    },
    filepath : {
        type: String,
        required: true,
    }
}, { timestamps: true });


const pendingUser = mongoose.model('pendingUser', pendingUserSchema);

export default pendingUser;
