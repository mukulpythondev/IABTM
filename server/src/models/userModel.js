import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,  
  },
  profileName: {
    type: String,
    required: true,
    trim: true,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'], // Gender selection
    required: true
  },
  dob: {
    type: Date,
  },
  phone: {
    type: Number,
    required: true,
    maxlength: 10  // Maximum length for US phone numbers
  },
  email: {
    type: String,
    required: true,
    unique: true, 
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  profile: {  // Profile picture URL
    type: String,
    default: "",  
  },
  attributes: {
    type: [{
      currentSelf: {
        type: [String], // Array of user behaviors for current self
        default: ["Unrelaxed", "Absent minded", "Afraid", "Exhausted"]
      },
      imagineSelf: {
        type: [String], // Array of user behaviors for imagined self
        default: ["Intelligent", "Wealthy", "Patient", "Social"]
      }
    }],
    default: [{}],  // Ensure default structure for both `currentSelf` and `imagineSelf`
  },
  paymentMethods: {
    type: [{
      methodType: {
        type: String,
        enum: ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer'],
      },
      cardNumber: {
        type: String,
      },
      expiryDate: {
        type: String,  
      }
    }],
    default: []  // No payment methods by default
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt timestamps
});

export default mongoose.model('User', userSchema);
