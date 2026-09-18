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


const makeProxyOptions = (serviceName) => ({
    parseReqBody: false,
    limit: "10mb",
    proxyErrorHandler: (err, res, next) => {
        if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
            return res.status(503).json({ message: `${serviceName} is temporarily unavailable. Please try again.` })
        }
        next(err)
    }
})

app.use("/auth", proxy(process.env.AUTH_SERVICE || "http://127.0.0.1:8001", makeProxyOptions("Auth service")))
app.use("/chat", protect, (req, res, next) => {
    req.headers["x-user-id"] = req.user.userId
    next()
}, proxy(process.env.CHAT_SERVICE || "http://127.0.0.1:8002", makeProxyOptions("Chat service")))
app.use("/agent", protect, (req, res, next) => {
    req.headers["x-user-id"] = req.user.userId
    next()
}, proxy(process.env.AGENT_SERVICE || "http://127.0.0.1:8003", makeProxyOptions("Agent service")))

// Body parsing only for gateway-owned routes (not proxied routes)
app.use("/api", express.json({ limit: "10mb" }), express.urlencoded({ limit: "10mb", extended: true }), protect)
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

