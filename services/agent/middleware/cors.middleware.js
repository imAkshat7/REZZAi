const corsMiddleware = (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    res.setHeader("Access-Control-Allow-Credentials", "true")

    if (req.method === "OPTIONS") {
        return res.sendStatus(204)
    }

    return next()
}

export default corsMiddleware