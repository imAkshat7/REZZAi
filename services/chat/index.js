import express from "express"
import db from "./config/db.js"
import dotenv from "dotenv"
import corsMiddleware from "./middleware/cors.middleware.js"
import chatRouter from "./route/chat.route.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT
const HOST = process.env.HOST || "127.0.0.1"

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ limit: "50mb", extended: true }))
app.use(corsMiddleware)
app.use("/", chatRouter)

app.get("/", (req, res) => {
    res.status(200).json({ "message": "chat service" })
})

db()
    .then(() => app.listen(PORT, HOST, () => console.log(`Chat service listening on ${HOST}:${PORT}`)))
    .catch((error) => {
        console.error("Chat service could not start:", error)
        process.exit(1)
    })