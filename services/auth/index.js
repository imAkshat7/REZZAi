import express from "express"
import db from "./config/db.js"
import dotenv from "dotenv"
import authRouter from "./route/auth.route.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT
const HOST = process.env.HOST || "127.0.0.1"

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ limit: "50mb", extended: true }))
app.use((req, res, next) => {
    const origin = req.headers.origin || process.env.FRONTEND_URL || "http://localhost:5173"
    res.header("Access-Control-Allow-Origin", origin)
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    res.header("Access-Control-Allow-Credentials", "true")
    if (req.method === "OPTIONS") return res.sendStatus(204)
    next()
})

app.use("/", authRouter)

app.get("/", (req, res) => {
    res.status(200).json({ "message": "Auth service" })
})

db()
    .then(() => app.listen(PORT, HOST, () => console.log(`Auth service listening on ${HOST}:${PORT}`)))
    .catch((error) => {
        console.error("Auth service could not start:", error)
        process.exit(1)
    })