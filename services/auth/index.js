import express from "express"
import db from "./config/db.js"
import dotenv from "dotenv"
import authRouter from "./route/auth.route.js"

dotenv.config()

const app = express()
const PORT= process.env.PORT

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ limit: "50mb", extended: true }))
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173")
    res.header("Access-Control-Allow-Headers", "Content-Type")
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    res.header("Access-Control-Allow-Credentials", "true")
    if (req.method === "OPTIONS") return res.sendStatus(204)
    next()
})

app.use("/", authRouter)

app.get("/",(req,res)=>{

    res.status(200).json({"message":"Auth service"})
})

db()
    .then(() => app.listen(PORT,()=>console.log(`listening on PORT ${PORT}`)))
    .catch((error) => {
        console.error("Auth service could not start:", error)
        process.exit(1)
    })