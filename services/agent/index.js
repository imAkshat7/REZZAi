import express from "express"
import db from "./config/db.js"
import dotenv from "dotenv"
import corsMiddleware from "./middleware/cors.middleware.js"
import errorMiddleware from "./middleware/error.middleware.js"
import agentRouter from "./route/agent.route.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT
const HOST = process.env.HOST || "127.0.0.1"

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ limit: "10mb", extended: true }))
app.use(corsMiddleware)
app.use("/", agentRouter)

app.get("/", (req, res) => {
    res.status(200).json({ "message": "Agent service" })
})

app.use(errorMiddleware)

db()
    .then(() => app.listen(PORT, HOST, () => console.log(`Agent service listening on ${HOST}:${PORT}`)))
    .catch((error) => {
        console.error("Agent service could not start:", error)
        process.exit(1)
    })