import mongoose from "mongoose"


const connectDB= async ()=>{
    try {
        const connectionInstannce = await mongoose.connect(`${process.env.MONGODB_URL}`)
        console.log(`Mongodb is hosted on ${connectionInstannce.connection.host}`)
    } catch (error) {
        console.log("Error:",error)
        process.exit((1))
    }
}
export default connectDB