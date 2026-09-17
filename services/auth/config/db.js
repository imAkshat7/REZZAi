import mongoose from "mongoose"

const connectDb=async()=>{

    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("DB connected")

    } catch (error) {
        console.log("issue with DB",error)
    }

}

export default connectDb;