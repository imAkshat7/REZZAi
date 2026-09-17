import "dotenv/config"
import redis from "../../../shared/redis/redis.js"

const MAX_MESSAGES = 20
const MEMORY_TTL_SECONDS = 60 * 60 * 24 * 7

const getMemoryKey = (conversationId) => `agent:memory:${conversationId}`

const validateConversationId = (conversationId) => {
	if (!conversationId) {
		throw new Error("conversationId is required")
	}
}

const parseMessage = (message) => {
	try {
		return JSON.parse(message)
	} catch {
		return null
	}
}

export const getMemory = async (conversationId) => {
	validateConversationId(conversationId)

	const messages = await redis.lrange(getMemoryKey(conversationId), 0, MAX_MESSAGES - 1)

	return messages
		.map(parseMessage)
		.filter(Boolean)
		.reverse()
}

export const addMemory = async (conversationId, message) => {
	validateConversationId(conversationId)

	if (!message?.role || !message?.content) {
		throw new Error("message role and content are required")
	}

	const memoryKey = getMemoryKey(conversationId)
	const entry = JSON.stringify({
		role: message.role,
		content: String(message.content)
	})

	await redis.lpush(memoryKey, entry)
	await redis.ltrim(memoryKey, 0, MAX_MESSAGES - 1)
	await redis.expire(memoryKey, MEMORY_TTL_SECONDS)
}

export const clearMemory = async (conversationId) => {
	validateConversationId(conversationId)
	await redis.del(getMemoryKey(conversationId))
}

export { MAX_MESSAGES }
