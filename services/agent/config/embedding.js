import "dotenv/config"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import { getApiKeys } from "./llmmodel.js"
import { sendTelegramLog } from "../utils/telegramLogger.js"

class FallbackEmbeddings {
	async _executeWithFallback(actionName, fn) {
		const keys = getApiKeys("Gemini Embeddings", ["GOOGLE", "GEMINI"])

		if (keys.length === 0) {
			const noKeyErr = new Error("No API keys configured for Gemini Embeddings.")
			console.error("❌ [Gemini Embeddings]", noKeyErr.message)
			await sendTelegramLog(
				"❌ <b>[Gemini Embeddings Error]</b>\nNo API keys configured in .env file!",
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
				const embeddingInstance = new GoogleGenerativeAIEmbeddings({
					model: "gemini-embedding-001",
					apiKey
				})
				return await fn(embeddingInstance)
			} catch (err) {
				lastError = err
				const errDetail = err?.message || String(err)
				const warnText = `⚠️ <b>[Gemini Embeddings API Key ${keyNum} Failed]</b>\nError: ${errDetail}\n${
					hasNext ? `👉 Retrying with Key ${keyNum + 1}...` : "❌ No more fallback keys available."
				}`

				console.warn(`[Gemini Embeddings] Key ${keyNum} failed:`, errDetail)
				await sendTelegramLog(warnText, "WARN")
			}
		}

		const totalKeys = keys.length
		const errorText = `❌ <b>[Gemini Embeddings All Keys Failed]</b>\nAttempted ${totalKeys} API key(s).\nFinal Error: ${
			lastError?.message || String(lastError)
		}`

		console.error(`[Gemini Embeddings] All ${totalKeys} keys failed.`)
		await sendTelegramLog(errorText, "ERROR")

		throw lastError
	}

	async embedQuery(text) {
		return this._executeWithFallback("embedQuery", (emb) => emb.embedQuery(text))
	}

	async embedDocuments(documents) {
		return this._executeWithFallback("embedDocuments", (emb) => emb.embedDocuments(documents))
	}
}

export const embeddings = new FallbackEmbeddings()
export default embeddings