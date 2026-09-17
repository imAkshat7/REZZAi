import mongoose from "mongoose"

const messageSchema = new mongoose.Schema({
	conversation: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Conversation",
		required: true,
		index: true
	},
	sender: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true
	},
	content: {
		type: String,
		required: true,
		trim: true
	},
	role: {
		type: String,
		enum: ["user", "assistant"],
		required: true
	},
	images: {
		type: [String],
		default: []
	}
}, {
	timestamps: true
})

const Message = mongoose.model("Message", messageSchema)

export default Message
