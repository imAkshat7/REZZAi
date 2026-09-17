import "dotenv/config"
import { ChatGroq } from "@langchain/groq"
import { ChatOpenAI } from "@langchain/openai"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { sendTelegramLog } from "../utils/telegramLogger.js"

export const getApiKeys = (providerName, prefixes) => {
	const keyMap = new Map()

	for (const [envKey, envValue] of Object.entries(process.env)) {
		if (!envValue || typeof envValue !== "string" || !envValue.trim()) continue

		const upperKey = envKey.toUpperCase()
		for (const prefix of prefixes) {
			const upperPrefix = prefix.toUpperCase()

			if (
				upperKey === upperPrefix ||
				upperKey === `${upperPrefix}_KEY` ||
				upperKey === `${upperPrefix}_API_KEY`
			) {
				if (!keyMap.has(1)) keyMap.set(1, envValue.trim())
			} else {
				const match = upperKey.match(/_(\d+)$/)
				if (match) {
					const index = parseInt(match[1], 10)
					if (index > 0) {
						if (
							upperKey.startsWith(`${upperPrefix}_`) ||
							upperKey.startsWith(`${upperPrefix}_KEY_`) ||
							upperKey.startsWith(`${upperPrefix}_API_KEY_`)
						) {
							if (!keyMap.has(index)) keyMap.set(index, envValue.trim())
						}
					}
				}
			}
		}
	}

	const sortedIndices = Array.from(keyMap.keys()).sort((a, b) => a - b)
	const keys = sortedIndices.map((idx) => keyMap.get(idx))

	return keys
}

export class FallbackModelWrapper {
	constructor(providerName, prefixes, factory, bindings = []) {
		this.providerName = providerName
		this.prefixes = prefixes
		this.factory = factory
		this.bindings = bindings
	}

	_createBoundModel(apiKey) {
		let model = this.factory(apiKey)
		for (const binding of this.bindings) {
			model = binding(model)
		}
		return model
	}

	async executeWithFallback(actionName, fn) {
		const keys = getApiKeys(this.providerName, this.prefixes)

		if (keys.length === 0) {
			const noKeyErr = new Error(
				`No API keys configured for provider "${this.providerName}". Please check your .env file.`
			)
			console.error(`❌ [${this.providerName}]`, noKeyErr.message)
			await sendTelegramLog(
				`❌ <b>[${this.providerName} Error]</b>\nNo API keys found in .env file!`,
				"ERROR"
			)
			throw noKeyErr
		}

		let lastError = null

		for (let i = 0; i < keys.length; i++) {
			const apiKey = keys[i]
			const keyNum = i + 1
			const hasNext = i + 1 < keys.length

			try {
				const modelInstance = this._createBoundModel(apiKey)
				return await fn(modelInstance)
			} catch (err) {
				lastError = err
				const errDetail = err?.message || String(err)

				const warnText = `⚠️ <b>[${this.providerName} API Key ${keyNum} Failed]</b>\nError: ${errDetail}\n${
					hasNext ? `👉 Retrying with Key ${keyNum + 1}...` : "❌ No more fallback keys available."
				}`

				console.warn(`[${this.providerName}] Key ${keyNum} failed:`, errDetail)
				await sendTelegramLog(warnText, "WARN")
			}
		}

		const totalKeys = keys.length
		const errorText = `❌ <b>[${this.providerName} All Keys Failed]</b>\nAttempted ${totalKeys} API key(s).\nFinal Error: ${
			lastError?.message || String(lastError)
		}`

		console.error(`[${this.providerName}] All ${totalKeys} keys failed.`)
		await sendTelegramLog(errorText, "ERROR")

		throw lastError
	}

	async invoke(input, options) {
		return this.executeWithFallback("invoke", (model) => model.invoke(input, options))
	}

	async stream(input, options) {
		return this.executeWithFallback("stream", (model) => model.stream(input, options))
	}

	bindTools(tools, options) {
		return new FallbackModelWrapper(this.providerName, this.prefixes, this.factory, [
			...this.bindings,
			(m) => m.bindTools(tools, options)
		])
	}

	withStructuredOutput(schema, options) {
		return new FallbackModelWrapper(this.providerName, this.prefixes, this.factory, [
			...this.bindings,
			(m) => m.withStructuredOutput(schema, options)
		])
	}
}

export const groq = new FallbackModelWrapper("Groq", ["GROQ"], (apiKey) => {
	return new ChatGroq({
		model: "openai/gpt-oss-120b",
		apiKey,
		temperature: 0,
		maxTokens: undefined,
		maxRetries: 0
	})
})

export const openrouterCoding = new FallbackModelWrapper(
	"OpenRouter",
	["OPENROUTER"],
	(apiKey) => {
		return new ChatOpenAI({
			model: "deepseek/deepseek-chat",
			apiKey,
			configuration: {
				baseURL: "https://openrouter.ai/api/v1"
			},
			temperature: 0,
			maxTokens: 2500,
			maxRetries: 0
		})
	}
)

export const gemini = new FallbackModelWrapper(
	"Gemini",
	["GOOGLE", "GEMINI"],
	(apiKey) => {
		return new ChatGoogleGenerativeAI({
			model: "gemini-3.6-flash",
			apiKey,
			temperature: 0,
			maxRetries: 0
		})
	}
)

export const getModel = (agent) => {
	switch (agent) {
		case "chat":
		case "search":
			return groq
		case "coding":
			return openrouterCoding
		case "pdfRag":
		case "imageAnalyzer":
		case "gemini":
			return gemini
		default:
			return groq
	}
}