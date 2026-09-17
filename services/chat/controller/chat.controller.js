import mongoose from "mongoose"
import Conversation from "../models/conversation.model.js"
import Message from "../models/message.model.js"

const getUserId = (req) => req.headers["x-user-id"]

const isValidId = (id) => mongoose.isValidObjectId(id)

export const createConversation = async (req, res) => {
    try {
        const userId = getUserId(req)
        const { title } = req.body

        if (!userId || !isValidId(userId)) {
            return res.status(401).json({ message: "Authenticated user is required" })
        }

        const conversation = await Conversation.create({
            participants: [userId],
            title: title?.trim() || undefined
        })

        return res.status(201).json(conversation)
    } catch (error) {
        console.error("Create conversation failed:", error)
        return res.status(500).json({ message: "Could not create conversation" })
    }
}

export const getConversations = async (req, res) => {
    try {
        const userId = getUserId(req)

        if (!userId || !isValidId(userId)) {
            return res.status(401).json({ message: "Authenticated user is required" })
        }

        const conversations = await Conversation.find({ participants: userId })
            .populate("lastMessage")
            .sort({ updatedAt: -1 })

        return res.status(200).json(conversations)
    } catch (error) {
        console.error("Get conversations failed:", error)
        return res.status(500).json({ message: "Could not get conversations" })
    }
}

export const getConversation = async (req, res) => {
    try {
        const userId = getUserId(req)
        const { conversationId } = req.params

        if (!userId || !isValidId(userId) || !isValidId(conversationId)) {
            return res.status(400).json({ message: "Valid user and conversation IDs are required" })
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        }).populate("lastMessage")

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" })
        }

        return res.status(200).json(conversation)
    } catch (error) {
        console.error("Get conversation failed:", error)
        return res.status(500).json({ message: "Could not get conversation" })
    }
}

export const updateConversation = async (req, res) => {
    try {
        const userId = getUserId(req)
        const { conversationId } = req.params
        const { title } = req.body

        if (!userId || !isValidId(userId) || !isValidId(conversationId)) {
            return res.status(400).json({ message: "Valid user and conversation IDs are required" })
        }

        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({ message: "Conversation title is required" })
        }

        const conversation = await Conversation.findOneAndUpdate(
            { _id: conversationId, participants: userId },
            { title: title.trim() },
            { new: true, runValidators: true }
        )

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" })
        }

        return res.status(200).json(conversation)
    } catch (error) {
        console.error("Update conversation failed:", error)
        return res.status(500).json({ message: "Could not update conversation" })
    }
}

export const deleteConversation = async (req, res) => {
    try {
        const userId = getUserId(req)
        const { conversationId } = req.params

        if (!userId || !isValidId(userId) || !isValidId(conversationId)) {
            return res.status(400).json({ message: "Valid user and conversation IDs are required" })
        }

        const conversation = await Conversation.findOneAndDelete({
            _id: conversationId,
            participants: userId
        })

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" })
        }

        await Message.deleteMany({ conversation: conversationId })

        return res.status(204).send()
    } catch (error) {
        console.error("Delete conversation failed:", error)
        return res.status(500).json({ message: "Could not delete conversation" })
    }
}

export const getMessages = async (req, res) => {
    try {
        const userId = getUserId(req)
        const { conversationId } = req.params

        if (!userId || !isValidId(userId) || !isValidId(conversationId)) {
            return res.status(400).json({ message: "Valid user and conversation IDs are required" })
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        })

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" })
        }

        const messages = await Message.find({ conversation: conversationId })
            .sort({ createdAt: 1 })

        return res.status(200).json(messages)
    } catch (error) {
        console.error("Get messages failed:", error)
        return res.status(500).json({ message: "Could not get messages" })
    }
}

export const createMessage = async (req, res) => {
    try {
        const userId = getUserId(req)
        const { conversationId } = req.params
        const { content, role = "user", images = [] } = req.body

        if (!userId || !isValidId(userId) || !isValidId(conversationId)) {
            return res.status(400).json({ message: "Valid user and conversation IDs are required" })
        }

        if (!content?.trim()) {
            return res.status(400).json({ message: "Message content is required" })
        }

        if (!["user", "assistant"].includes(role)) {
            return res.status(400).json({ message: "Invalid message role" })
        }

        if (!Array.isArray(images) || images.some((image) => typeof image !== "string")) {
            return res.status(400).json({ message: "Invalid message images" })
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        })

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" })
        }

        const message = await Message.create({
            conversation: conversationId,
            sender: userId,
            content: content.trim(),
            role,
            images: images.slice(0, 10)
        })

        conversation.lastMessage = message._id
        await conversation.save()

        return res.status(201).json(message)
    } catch (error) {
        console.error("Create message failed:", error)
        return res.status(500).json({ message: "Could not create message" })
    }
}