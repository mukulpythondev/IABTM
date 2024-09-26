import { Schema } from "mongoose";

const userSchema = new Schema({
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
    required: true,
    unique: true, 
    lowercase: true, 
    validate: {
      validator: function (v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`,
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6,  
  },
  profile: {
    type: String,
    default: "",  
  }
}, {
  timestamps: true, 
});

export default mongoose.model('User', userSchema);
