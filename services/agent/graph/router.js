import { getModel } from "../config/llmmodel.js"
import { hasQdrantCollection } from "../config/VectorDb.js"

const supportedAgents = new Set([
	"chat",
	"search",
	"pdf",
	"ppt",
	"imageGen",
	"coding",
	"pdfRag",
	"imageAnalyzer"
])

const autoAgents = ["pdf", "ppt", "coding", "search", "chat"]

const routerPrompt = `
You are an AI task router. Classify the user's request into exactly one agent.

Available agents:
- chat: normal conversation, explanations, advice, or general questions
- search: internet lookup, current news, latest information, facts that may have changed, or finding existing images and pictures online
- coding: generate code, debug code, build a project, or design an API
- pdf: create, generate, or compile a new downloadable PDF document or report
- ppt: generate, edit, summarize, or create PowerPoint presentations
- imageGen is manual-only and must never be selected automatically. For finding existing pictures online, use search.

Return ONLY the single word agent name from this list:
chat, search, coding, pdf, ppt

User request:
<<<
{{prompt}}
>>>
`

const getAgentName = (content, userPrompt = "") => {
	const promptText = String(userPrompt || "").toLowerCase().trim()

	// High-precision keyword check for PDF document generation
	if (/\b(create|generate|make|build|export|download)\s+(a\s+)?pdf\b/i.test(promptText) ||
		/\bpdf\s+(report|file|document)\s+(create|generate|make|export)\b/i.test(promptText)) {
		return "pdf"
	}
	if (/\b(ppt|powerpoint|presentation|slides|create ppt|generate ppt)\b/i.test(promptText)) {
		return "ppt"
	}

	const text = (Array.isArray(content)
		? content.map((part) => typeof part === "string" ? part : part?.text || "").join(" ")
		: String(content || "")).toLowerCase().trim()

	for (const agent of autoAgents) {
		if (text === agent || text.includes(agent)) {
			return agent
		}
	}

	return "chat"
}

export const router = async (state) => {
	const conversationId = state?.conversationId
	const collectionName = conversationId ? `pdf-${conversationId}`.toLowerCase().replace(/[^a-z0-9_-]/g, "_") : null
	const userPrompt = String(state?.prompt || "").trim()
	const lowerPrompt = userPrompt.toLowerCase()

	// 1. Attached file handling (highest priority)
	if (state?.file) {
		const mimetype = String(state.file.mimetype || "").toLowerCase()
		const filename = String(state.file.originalname || "").toLowerCase()

		if (mimetype.includes("pdf") || filename.endsWith(".pdf")) {
			return { agent: "pdfRag" }
		}

		if (mimetype.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(filename)) {
			return { agent: "imageAnalyzer" }
		}
	}

	// Check if a PDF collection exists in Qdrant for this conversation session
	const pdfCollectionExists = collectionName ? await hasQdrantCollection(collectionName) : false

	// 2. Explicit agent selected from UI
	if (state?.agent && supportedAgents.has(state.agent)) {
		if (state.agent === "pdf") {
			// Distinguish PDF Q&A/Analysis vs PDF document creation
			const isPdfCreation = /\b(create|generate|make|build|export|download|write)\s+(a\s+)?pdf\b/i.test(lowerPrompt)
			if (!isPdfCreation && (pdfCollectionExists || /\b(question|what|tell|explain|summarize|content|search|find|show|list|read|pdf)\b/i.test(lowerPrompt))) {
				return { agent: "pdfRag" }
			}
		}
		return { agent: state.agent }
	}

	// 3. Auto-routing checks

	// Check A: Explicit request to CREATE a PDF file (PDF Generator)
	const isExplicitPdfCreate = /\b(create|generate|make|build|export|download)\s+.*?\bpdf\b/i.test(lowerPrompt) ||
		/\bpdf\s+(generator|document|file|report)\s+(create|generate|make|build)\b/i.test(lowerPrompt)

	if (isExplicitPdfCreate) {
		return { agent: "pdf" }
	}

	// Check B: Existing PDF collection in Qdrant for this conversation session
	if (pdfCollectionExists) {
		// Route follow-up questions to pdfRag unless user explicitly requested another agent action
		const isOtherAction = /\b(ppt|powerpoint|presentation|slides|generate image|create image|build app|write code)\b/i.test(lowerPrompt)
		if (!isOtherAction) {
			return { agent: "pdfRag" }
		}
	}

	// Check C: Prompt mentions PDF or uploaded document
	if (/\b(pdf|document|file|roadmap)\b/i.test(lowerPrompt) && !isExplicitPdfCreate) {
		if (pdfCollectionExists) {
			return { agent: "pdfRag" }
		}
	}

	// Check D: PPT Creation check
	if (/\b(ppt|powerpoint|presentation|slides|create ppt|generate ppt)\b/i.test(lowerPrompt)) {
		return { agent: "ppt" }
	}

	// Fast path keyword check
	const fastAgent = getAgentName("", userPrompt)
	if (fastAgent !== "chat" && fastAgent !== "pdf") {
		return { agent: fastAgent }
	}

	// LLM Router call
	try {
		const llm = getModel("router")
		const prompt = routerPrompt.replace("{{prompt}}", userPrompt)
		const response = await llm.invoke(prompt)

		const selectedAgent = getAgentName(response.content, userPrompt)
		if (selectedAgent === "pdf" && !isExplicitPdfCreate && pdfCollectionExists) {
			return { agent: "pdfRag" }
		}
		return { agent: selectedAgent }
	} catch (error) {
		console.error("Router error, falling back to pdfRag/chat:", error)
		return { agent: pdfCollectionExists ? "pdfRag" : "chat" }
	}
}