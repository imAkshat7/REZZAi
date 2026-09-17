import mongoose from "mongoose"

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }],
    title: {
        type: String,
        trim: true,
        default: "New conversation"
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    }
}, {
    timestamps: true
})

const Conversation = mongoose.model("Conversation", conversationSchema)

export default Conversation