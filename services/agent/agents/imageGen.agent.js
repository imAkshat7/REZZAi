import { getModel } from "../config/llmmodel.js"

const promptEnhancerSystem = `
You are REZZAi's expert AI Image Prompt Engineer.
Transform the user's request into an ultra-detailed, highly vivid, photorealistic prompt for state-of-the-art AI image generation.
Include precise artistic style, lighting (e.g. cinematic, studio lighting, volumetric light), background depth, color palette, texture, and 8k camera details.
IMPORTANT: Return ONLY the enhanced prompt text. Do NOT wrap in quotes, do NOT add introductory text, explanations, or markdown commentary.
`

export const imageagent = async (state) => {
	const prompt = String(state?.prompt || "").trim()

	if (!prompt) {
		return {
			aiResponse: "Please describe the image you would like me to generate.",
			images: []
		}
	}

	let enhancedPrompt = prompt
	try {
		const model = getModel("chat")
		const response = await model.invoke([
			["system", promptEnhancerSystem],
			["human", prompt]
		])
		const text = Array.isArray(response.content)
			? response.content.map((part) => typeof part === "string" ? part : part?.text || "").join("")
			: String(response.content || "")

		enhancedPrompt = text.replace(/["'`]/g, "").trim() || prompt
	} catch (err) {
		enhancedPrompt = prompt
	}

	const seed = Math.floor(Math.random() * 10000000)
	const encoded = encodeURIComponent(enhancedPrompt)
	const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true`

	return {
		aiResponse: "## Generated AI Image",
		images: [imageUrl],
		searchResults: []
	}
}
