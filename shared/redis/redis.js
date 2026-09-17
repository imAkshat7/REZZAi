import Redis from "ioredis"

const getCleanRedisUrl = () => {
	const raw = process.env.REDIS_URL
	if (!raw || typeof raw !== "string" || !raw.trim()) {
		return "redis://localhost:6379"
	}

	const match = raw.match(/(rediss?:\/\/[^\s"']+)/i)
	let url = match ? match[1] : raw.trim()

	if (url.startsWith("https://")) {
		url = url.replace(/^https:\/\//i, "rediss://")
	} else if (url.startsWith("http://")) {
		url = url.replace(/^http:\/\//i, "redis://")
	}

	if (raw.includes("--tls") && url.startsWith("redis://")) {
		url = url.replace(/^redis:\/\//i, "rediss://")
	}

	return url
}

const redisUrl = getCleanRedisUrl()
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

let redis
try {
	redis = new Redis(redisUrl, redisOptions)

	redis.on("connect", () => {
		console.log("redis connected")
	})

	redis.on("error", (err) => {
		if (err?.message) {
			console.warn("Redis warning:", err.message)
		}
	})
} catch (err) {
	console.warn("Failed to initialize Redis client, falling back:", err.message)
	redis = new Redis("redis://localhost:6379", redisOptions)
}

export default redis