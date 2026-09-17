import express from "express"
import { getCurrentUser } from "../controller/user.controller.js"

const router = express.Router()

router.get("/me", getCurrentUser)

export default router