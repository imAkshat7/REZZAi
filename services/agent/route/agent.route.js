import express from "express"
import { generateResponse, compilePdf } from "../controllers/agent.controller.js"
import upload from "../config/multer.js"
import { agentLimitMiddleware, getLimitsController } from "../middleware/limit.js"

const router = express.Router()

router.post("/chat", upload.single("file"), agentLimitMiddleware, generateResponse)
router.post("/compile-pdf", compilePdf)
router.get("/limits", getLimitsController)

export default router