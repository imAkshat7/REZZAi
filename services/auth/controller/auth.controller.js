import crypto from "node:crypto"
import { getAuth } from "firebase-admin/auth"
import { app } from "../config/firebase.js"
import User from "../model/user.model.js"
import redis from "../../../shared/redis/redis.js"

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

const getSessionId = (req) => {
    const sessionCookie = req.headers.cookie
        ?.split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith("session_id="))

    return sessionCookie?.slice("session_id=".length)
}

export const login = async(req,res) =>{

    try {
        const {token}=req.body
        if (!token) {
            return res.status(400).json({message: "Firebase token is required"})
        }

        const decoded = await getAuth(app).verifyIdToken(token)
        let user=await User.findOne({firebaseUid:decoded.uid})

        if(!user)
        {
            user=await User.create({
                firebaseUid:decoded.uid,
                name:decoded.name,
                email:decoded.email,
                avatar:decoded.picture

            })
        }
        

        const sessionId = crypto.randomUUID()
        await redis.set(
            `session:${sessionId}`,
            JSON.stringify({ userId: user._id.toString(),
                name:user.name,
                email:user.email,
                avatar:user.avatar
             }),
            "EX",
            SESSION_TTL_SECONDS
        )

        res.cookie("session_id", sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: SESSION_TTL_SECONDS * 1000
        })

        return res.status(200).json(user)

    } catch (error) {
        console.error("Google login failed:", error)
        return res.status(401).json({message: "Invalid Firebase token"})

    }

}

export const logout = async(req,res) => {
    try {
        const sessionId = getSessionId(req)

        if (sessionId) {
            await redis.del(`session:${sessionId}`)
        }

        res.clearCookie("session_id", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        })

        return res.status(200).json({ message: "Logged out successfully" })
    } catch (error) {
        console.error("Logout failed:", error)
        return res.status(500).json({ message: "Could not log out" })
    }
}