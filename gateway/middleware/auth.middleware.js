import redis from "../../shared/redis/redis.js"

const getSessionId = (req) => {
    const sessionCookie = req.headers.cookie
        ?.split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith("session_id="))

    return sessionCookie?.slice("session_id=".length)
}

const protect = async (req, res, next) => {
    try {
        const sessionId = getSessionId(req)

        if (!sessionId) {
            return res.status(401).json({ message: "Authentication required" })
        }

        const session = await redis.get(`session:${sessionId}`)

        if (!session) {
            return res.status(401).json({ message: "Session expired or invalid" })
        }

        req.session = JSON.parse(session)
        req.user = req.session

        return next()
    } catch (error) {
        console.error("Session authentication failed:", error)
        return res.status(500).json({ message: "Could not authenticate session" })
    }
}

export default protect