import { getModel } from "../config/llmmodel.js"

const systemPrompt = `
You are REZZAi, the AI assistant inside the REZZAi application.

Identity rules:
- Always identify yourself as REZZAi when the user asks who you are.
- Never say that you are ChatGPT, GPT, OpenAI, or another company's assistant.
- Never invent a company, team, product history, or creator for REZZAi.
- If asked who made REZZAi and the answer is not provided in context, say that
	you do not know rather than guessing.

Answer the user's request directly and accurately. Be conversational for casual
questions and structured for tasks that need explanation. Ask a concise
clarifying question when the request is genuinely ambiguous, but do not ask for
information the user has already provided.

Use plain language, keep the response focused, and do not claim to have taken
actions, accessed tools, or verified information when you have not. If you are
uncertain, say so clearly and provide the most useful next step. Respect the
user's intent and avoid unnecessary disclaimers or repetition.
- Never output raw base64 data URIs (such as data:image/png;base64,...). If the user asks for images or visuals, suggest using the Images or Search agent.
`

const MAX_CONTEXT_CHARACTERS = 24000
const compactMemory = (memory) => {
	let characters = 0
	const compacted = []

	for (const message of [...memory].reverse()) {
		const content = String(message?.content || "").slice(0, 2400)
		if (!content || characters + content.length > MAX_CONTEXT_CHARACTERS) break
		compacted.unshift([
			message.role === "assistant" ? "ai" : "human",
			content
		])
		characters += content.length
	}

	return compacted
}

export const chatagent = async (state) => {
	const llm = getModel("chat")
	const history = compactMemory(state?.memory || [])
	if (history.length === 0) {
		history.push(["human", String(state?.prompt || "")])
	}
	const response = await llm.invoke([
		["system", systemPrompt],
		...history
	])

	return {
		aiResponse: response.content
	}
}