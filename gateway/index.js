import express from "express"
import dotenv from "dotenv"
import proxy from "express-http-proxy"
import cors from "cors"
import protect from "./middleware/auth.middleware.js"
import userRouter from "./route/user.route.js"
import { getCurrentUser } from "./controller/user.controller.js"

dotenv.config()

const app = express()

app.use(cors({
    origin: (origin, callback) => {
        // Dynamically allow requesting origin so credentials: true works seamlessly
        callback(null, true)
    },
    credentials: true
}))

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ limit: "10mb", extended: true }))

const proxyOptions = {
    parseReqBody: false,
    limit: "10mb"
}

app.use("/auth", proxy(process.env.AUTH_SERVICE || "http://127.0.0.1:8001", proxyOptions))
app.use("/chat", protect, (req, res, next) => {
    req.headers["x-user-id"] = req.user.userId
    next()
}, proxy(process.env.CHAT_SERVICE || "http://127.0.0.1:8002", proxyOptions))
app.use("/agent", protect, (req, res, next) => {
    req.headers["x-user-id"] = req.user.userId
    next()
}, proxy(process.env.AGENT_SERVICE || "http://127.0.0.1:8003", proxyOptions))

app.use("/api", protect)
app.use("/api/user", userRouter)
app.get("/me", protect, getCurrentUser)

app.get("/health", (req, res) => {
    res.status(200).json({ "Health": "ok" })
})

app.get("/", (req, res) => {
    res.status(200).json({
        "message": "hello from gateway"
    })
})

const PORT = process.env.PORT || 8000
const HOST = "0.0.0.0"

app.listen(PORT, HOST, () => {
    console.log(`Gateway running on ${HOST}:${PORT}`)
})

