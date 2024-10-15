import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email : {
        type : String,
    },
    phoneNumber: {
        type: String,
        unique: true,
        sparse: true,
        validate: {
            validator: function (v) {
                return v === null || /^\d{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    otp : {
        type: Number
    }
    , otpExpiration : {
        type : Date
    }
}, { timestamps: true });

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;




