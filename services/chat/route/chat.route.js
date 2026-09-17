import express from "express"
import {
    createConversation,
    createMessage,
    deleteConversation,
    getConversation,
    getConversations,
    getMessages,
    updateConversation
} from "../controller/chat.controller.js"

const router = express.Router()

router.post("/conversations", createConversation)
router.get("/conversations", getConversations)
router.get("/conversations/:conversationId", getConversation)
router.patch("/conversations/:conversationId", updateConversation)
router.delete("/conversations/:conversationId", deleteConversation)
router.get("/conversations/:conversationId/messages", getMessages)
router.post("/conversations/:conversationId/messages", createMessage)

export default router