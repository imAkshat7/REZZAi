const corsMiddleware = (req, res, next) => {
    const origin = req.headers.origin || process.env.FRONTEND_URL || "http://localhost:5173"
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-id")
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
    res.setHeader("Access-Control-Allow-Credentials", "true")

    if (req.method === "OPTIONS") {
        return res.sendStatus(204)
    }

    return next()
}

export default corsMiddleware