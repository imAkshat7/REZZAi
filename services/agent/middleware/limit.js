import redis from "../../../shared/redis/redis.js"

// Agent rate limits (requests per 5 hours window)
export const AGENT_LIMITS = {
	chat: 20,
	coding: 5,
	pdf: 5,
	ppt: 5,
	image: 5,
	search: 5
}

// 5 hours limit in milliseconds and seconds
export const RATE_LIMIT_WINDOW_MS = 5 * 60 * 60 * 1000 // 18,000,000 ms
export const RATE_LIMIT_WINDOW_SECONDS = 5 * 60 * 60 // 18,000 s

// In-memory sliding window fallback store if Redis is offline
const inMemoryStore = new Map()

/**
 * Normalizes an incoming agent name to the standardized key.
 */
export const normalizeAgentName = (agent) => {
	if (!agent) return "chat"
	const name = String(agent).toLowerCase().trim()

	if (name === "imagegen" || name === "imageanalyzer") return "image"
	if (name === "pdfrag") return "pdf"
	if (Object.prototype.hasOwnProperty.call(AGENT_LIMITS, name)) return name

	return "chat"
}

/**
 * Gets the configured max limit for an agent category.
 */
export const getAgentLimit = (agent) => {
	const name = normalizeAgentName(agent)
	return AGENT_LIMITS[name] ?? 20
}

/**
 * Fast keyword detector to guess agent when user selects "auto" mode.
 */
export const predictAgentFromReq = (req) => {
	const prompt = String(req.body?.prompt || "").toLowerCase().trim()
	const file = req.file

	if (file) {
		const mimetype = String(file.mimetype || "").toLowerCase()
		const filename = String(file.originalname || "").toLowerCase()
		if (mimetype.includes("pdf") || filename.endsWith(".pdf")) return "pdf"
		if (mimetype.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(filename)) return "image"
	}

	if (/\b(create|generate|make|build|export|download)\s+.*?\bpdf\b/i.test(prompt)) return "pdf"
	if (/\b(ppt|powerpoint|presentation|slides)\b/i.test(prompt)) return "ppt"
	if (/\b(code|coding|debug|script|function|program|build app|react|javascript|python|css|html)\b/i.test(prompt)) return "coding"
	if (/\b(search|find online|latest news|current price|weather|lookup)\b/i.test(prompt)) return "search"

	return "chat"
}

/**
 * Helper to manage in-memory sliding window rate limits.
 */
const checkAndConsumeInMemory = (userId, normalizedAgent, maxLimit, now, windowStart) => {
	const key = `${userId}:${normalizedAgent}`
	let timestamps = inMemoryStore.get(key) || []

	// Filter out timestamps outside the 5-hour window
	timestamps = timestamps.filter((ts) => ts > windowStart)

	if (timestamps.length >= maxLimit) {
		const oldestTs = timestamps[0] || windowStart
		const resetInMs = Math.max(0, (oldestTs + RATE_LIMIT_WINDOW_MS) - now)
		const resetInSeconds = Math.ceil(resetInMs / 1000)
		const resetInHours = (resetInMs / (1000 * 60 * 60)).toFixed(2)

		inMemoryStore.set(key, timestamps)

		return {
			allowed: false,
			agent: normalizedAgent,
			limit: maxLimit,
			currentCount: timestamps.length,
			remaining: 0,
			resetInMs,
			resetInSeconds,
			resetInHours
		}
	}

	timestamps.push(now)
	inMemoryStore.set(key, timestamps)

	return {
		allowed: true,
		agent: normalizedAgent,
		limit: maxLimit,
		currentCount: timestamps.length,
		remaining: maxLimit - timestamps.length,
		resetInMs: RATE_LIMIT_WINDOW_MS,
		resetInSeconds: RATE_LIMIT_WINDOW_SECONDS,
		resetInHours: "5.00"
	}
}

/**
 * Checks and consumes 1 quota for specified user and agent in the 5-hour window.
 */
export const checkAndConsumeAgentLimit = async (userId, agent) => {
	const normalizedAgent = normalizeAgentName(agent)
	const maxLimit = getAgentLimit(normalizedAgent)
	const now = Date.now()
	const windowStart = now - RATE_LIMIT_WINDOW_MS
	const key = `ratelimit:agent:${userId}:${normalizedAgent}`

	try {
		if (redis.status === "ready") {
			// Remove entries older than 5 hours
			await redis.zremrangebyscore(key, 0, windowStart)

			const count = await redis.zcard(key)

			if (count >= maxLimit) {
				const oldest = await redis.zrange(key, 0, 0, "WITHSCORES")
				const oldestTs = (oldest && oldest.length >= 2) ? Number(oldest[1]) : windowStart
				const resetInMs = Math.max(0, (oldestTs + RATE_LIMIT_WINDOW_MS) - now)
				const resetInSeconds = Math.ceil(resetInMs / 1000)
				const resetInHours = (resetInMs / (1000 * 60 * 60)).toFixed(2)

				return {
					allowed: false,
					agent: normalizedAgent,
					limit: maxLimit,
					currentCount: count,
					remaining: 0,
					resetInMs,
					resetInSeconds,
					resetInHours
				}
			}

			const member = `${now}:${Math.random().toString(36).substring(2, 9)}`
			await redis.zadd(key, now, member)
			await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS)

			return {
				allowed: true,
				agent: normalizedAgent,
				limit: maxLimit,
				currentCount: count + 1,
				remaining: maxLimit - (count + 1),
				resetInMs: RATE_LIMIT_WINDOW_MS,
				resetInSeconds: RATE_LIMIT_WINDOW_SECONDS,
				resetInHours: "5.00"
			}
		}
	} catch (redisErr) {
		console.warn("Redis error during rate limiting, falling back to in-memory:", redisErr.message)
	}

	return checkAndConsumeInMemory(userId, normalizedAgent, maxLimit, now, windowStart)
}

/**
 * Peeks rate limit state without consuming quota.
 */
export const peekAgentLimit = async (userId, agent) => {
	const normalizedAgent = normalizeAgentName(agent)
	const maxLimit = getAgentLimit(normalizedAgent)
	const now = Date.now()
	const windowStart = now - RATE_LIMIT_WINDOW_MS
	const key = `ratelimit:agent:${userId}:${normalizedAgent}`

	try {
		if (redis.status === "ready") {
			await redis.zremrangebyscore(key, 0, windowStart)
			const count = await redis.zcard(key)
			const remaining = Math.max(0, maxLimit - count)

			let resetInMs = RATE_LIMIT_WINDOW_MS
			if (count > 0) {
				const oldest = await redis.zrange(key, 0, 0, "WITHSCORES")
				const oldestTs = (oldest && oldest.length >= 2) ? Number(oldest[1]) : windowStart
				resetInMs = Math.max(0, (oldestTs + RATE_LIMIT_WINDOW_MS) - now)
			}

			return {
				agent: normalizedAgent,
				limit: maxLimit,
				used: count,
				remaining,
				resetInSeconds: Math.ceil(resetInMs / 1000)
			}
		}
	} catch (err) {
		console.warn("Redis peek error, fallback:", err.message)
	}

	const memoryKey = `${userId}:${normalizedAgent}`
	const timestamps = (inMemoryStore.get(memoryKey) || []).filter((ts) => ts > windowStart)
	const count = timestamps.length
	const oldestTs = timestamps[0] || windowStart
	const resetInMs = count > 0 ? Math.max(0, (oldestTs + RATE_LIMIT_WINDOW_MS) - now) : RATE_LIMIT_WINDOW_MS

	return {
		agent: normalizedAgent,
		limit: maxLimit,
		used: count,
		remaining: Math.max(0, maxLimit - count),
		resetInSeconds: Math.ceil(resetInMs / 1000)
	}
}

/**
 * Returns full status of all agent rate limits for a user.
 */
export const getAgentLimitsStatus = async (userId) => {
	const agents = Object.keys(AGENT_LIMITS)
	const result = {}

	for (const agent of agents) {
		result[agent] = await peekAgentLimit(userId, agent)
	}

	return {
		userId,
		windowHours: 5,
		limits: result
	}
}

/**
 * Express middleware for enforcing 5-hour agent rate limits.
 */
export const agentLimitMiddleware = async (req, res, next) => {
	try {
		const userId = req.headers["x-user-id"] || req.user?.userId
		if (!userId) {
			return res.status(401).json({ message: "Authenticated user ID is required for agent rate limiting" })
		}

		let agent = req.body?.agent
		if (!agent || agent === "auto") {
			agent = predictAgentFromReq(req)
		}

		const limitResult = await checkAndConsumeAgentLimit(userId, agent)

		res.setHeader("X-RateLimit-Limit", limitResult.limit)
		res.setHeader("X-RateLimit-Remaining", limitResult.remaining)
		res.setHeader("X-RateLimit-Reset", Math.ceil((Date.now() + limitResult.resetInMs) / 1000))

		if (!limitResult.allowed) {
			res.setHeader("Retry-After", limitResult.resetInSeconds)
			return res.status(429).json({
				error: "Rate limit exceeded",
				message: `Rate limit exceeded for ${limitResult.agent} agent. Limit is ${limitResult.limit} requests per 5 hours.`,
				agent: limitResult.agent,
				limit: limitResult.limit,
				used: limitResult.currentCount,
				remaining: 0,
				resetInSeconds: limitResult.resetInSeconds,
				resetInHours: limitResult.resetInHours
			})
		}

		req.rateLimit = limitResult
		next()
	} catch (error) {
		console.error("Agent rate limit middleware error:", error)
		next()
	}
}

/**
 * Controller endpoint for checking current user limits status.
 */
export const getLimitsController = async (req, res) => {
	try {
		const userId = req.headers["x-user-id"] || req.user?.userId
		if (!userId) {
			return res.status(401).json({ message: "Authenticated user ID is required" })
		}

		const status = await getAgentLimitsStatus(userId)
		return res.status(200).json(status)
	} catch (error) {
		console.error("Get limits status error:", error)
		return res.status(500).json({ message: "Could not fetch agent rate limits" })
	}
}
