import Redis from "ioredis"

const redisUrl = process.env.REDIS_URL?.trim().replace(/^https?:\/\//, "redis://") || "redis://localhost:6379"
const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
        return Math.min(times * 200, 3000)
    }
})

redis.on("connect", () => {
    console.log("redis connected")
})

redis.on("error", (err) => {
    // Only log distinct warnings if redis was previously ready
    if (err?.message) {
        console.warn("Redis warning:", err.message)
    }
})

export default redis