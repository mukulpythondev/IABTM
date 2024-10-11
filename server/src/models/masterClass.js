import mongoose from "mongoose";

const masterclassSchema = new mongoose.Schema({
    title : {
        type : String,
        required : true
    },
    tags : [
        {
            type: String
        }
    ],
    video : {
        type : String,
        required : true
    }
})

const masterclass = mongoose.model('expert', masterclassSchema);

export default masterclass;