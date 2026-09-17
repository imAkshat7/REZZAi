import Redis from "ioredis"

let redisUrl = process.env.REDIS_URL?.trim() || "redis://localhost:6379"

if (redisUrl.startsWith("https://")) {
	redisUrl = redisUrl.replace(/^https:\/\//, "rediss://")
} else if (redisUrl.startsWith("http://")) {
	redisUrl = redisUrl.replace(/^http:\/\//, "redis://")
}

const redisOptions = {
	maxRetriesPerRequest: null,
	retryStrategy(times) {
		return Math.min(times * 200, 3000)
	}
}

if (redisUrl.startsWith("rediss://")) {
	redisOptions.tls = {
		rejectUnauthorized: false
	}
}

const redis = new Redis(redisUrl, redisOptions)

redis.on("connect", () => {
	console.log("redis connected")
})

redis.on("error", (err) => {
	if (err?.message) {
		console.warn("Redis warning:", err.message)
	}
})

export default redis