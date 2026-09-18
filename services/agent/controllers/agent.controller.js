import { graph } from "../graph/graph.js"
import { getModel } from "../config/llmmodel.js"
import { addMemory, getMemory } from "../config/memory.js"
import { generatePdf } from "../utils/generatepdf.js"

const getUserId = (req) => req.headers["x-user-id"]

const getResponseText = (content) => {
	if (Array.isArray(content)) {
		return content
			.map((part) => typeof part === "string" ? part : part?.text || "")
			.join("")
	}

	return String(content || "")
}

const saveMessage = async (conversationId, userId, content, role, images = []) => {
	const response = await fetch(
		`${process.env.CHAT_SERVICE}/conversations/${conversationId}/messages`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-user-id": userId
			},
			body: JSON.stringify({ content, role, images })
		}
	)

	if (!response.ok) {
		throw new Error(`Chat service returned ${response.status}`)
	}

	return response.json()
}

const updateConversationTitle = async (conversationId, userId, title) => {
	const response = await fetch(
		`${process.env.CHAT_SERVICE}/conversations/${conversationId}`,
		{
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				"x-user-id": userId
			},
			body: JSON.stringify({ title })
		}
	)

	if (!response.ok) {
		throw new Error(`Chat service title update returned ${response.status}`)
	}

	return response.json()
}

const suggestTitle = async (prompt) => {
	const response = await getModel("chat").invoke(`
Suggest a short conversation title for this user request.
Return only the title, with no quotes, punctuation at the end, markdown, or explanation.
Use 3 to 6 words and make it specific to the request.

User request:
${prompt}
`)

	const title = getResponseText(response.content)
		.replace(/["'`]/g, "")
		.replace(/[.!?]+$/, "")
		.replace(/\s+/g, " ")
		.trim()

	return title.split(" ").slice(0, 6).join(" ").slice(0, 60) || "New conversation"
}

export const generateResponse = async (req, res) => {
	try {
		const userId = getUserId(req)
		const { prompt, conversationId, conversation, agent } = req.body
		const shouldSuggestTitle = req.body.suggestTitle === true || req.body.suggestTitle === "true"
		const id = conversationId || conversation
		const file = req.file || null

		if (!userId) {
			return res.status(401).json({ message: "Authenticated user is required" })
		}

		if (!prompt?.trim() || !id) {
			return res.status(400).json({
				message: "prompt and conversationId are required"
			})
		}

		await saveMessage(id, userId, prompt.trim(), "user")
		await addMemory(id, { role: "user", content: prompt.trim() })

		const result = await graph.invoke({
			prompt: prompt.trim(),
			conversationId: id,
			memory: await getMemory(id),
			agent,
			file
		})
		const content = getResponseText(result.aiResponse)
		const images = Array.isArray(result.images) ? result.images : []

		// Extract embedded metadata comments (e.g. <!-- ppt_data:{...} -->)
		// Strip them from the saved message so they never appear in chat history
		let metadata = {}
		const pptMatch = content.match(/<!--\s*ppt_data:(.*?)\s*-->/s)
		if (pptMatch) {
			try { metadata.pptData = JSON.parse(pptMatch[1]) } catch {}
		}
		const cleanContent = content.replace(/<!--\s*ppt_data:.*?\s*-->/s, "").trim()

		const responseContent = cleanContent || (images.length > 0
			? "## Images found\n\nHere are some images I found online."
			: "")

		if (!responseContent.trim()) {
			return res.status(502).json({ message: "Agent returned an empty response" })
		}

		const savedMessage = await saveMessage(id, userId, responseContent, "assistant", images)
		await addMemory(id, { role: "assistant", content: responseContent })
		let title

		if (shouldSuggestTitle) {
			try {
				title = await suggestTitle(prompt.trim())
				await updateConversationTitle(id, userId, title)
			} catch (titleError) {
				console.error("Suggest conversation title failed:", titleError)
			}
		}

		return res.status(200).json({
			agent: result.agent,
			intent: result.intent,
			content: responseContent,
			images,
			message: savedMessage,
			title,
			metadata  // contains pptData, etc. — used by frontend canvas, never shown in chat
		})
	} catch (error) {
		console.error("Generate agent response failed:", error)
		return res.status(500).json({ message: "Could not generate agent response" })
	}
}

export const compilePdf = async (req, res) => {
	try {
		const { data } = req.body
		if (!data || !data.title) {
			return res.status(400).json({ message: "Valid document data is required" })
		}
		const pdfBuffer = await generatePdf(data)

		const cleanFilename = String(data.title).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40)
		res.setHeader("Content-Type", "application/pdf")
		res.setHeader("Content-Disposition", `attachment; filename="${cleanFilename}.pdf"`)
		return res.send(pdfBuffer)
	} catch (error) {
		console.error("Compile PDF failed:", error)
		return res.status(500).json({ message: "Could not compile PDF document" })
	}
}
