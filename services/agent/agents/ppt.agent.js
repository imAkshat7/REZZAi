import { getModel } from "../config/llmmodel.js"
import { generatePpt } from "../utils/generateppt.js"

const systemPrompt = `
You are an expert presentation designer.

Return ONLY valid JSON.
Do NOT return markdown code fences (such as \`\`\`json), do NOT return any explanations, introductory text, or commentary.

JSON Structure:
{
  "title": "Presentation Title",
  "subtitle": "Presentation Subtitle",
  "slides": [
    {
      "title": "Slide Title",
      "points": [
        "Concise bullet point 1",
        "Concise bullet point 2",
        "Concise bullet point 3",
        "Concise bullet point 4"
      ]
    }
  ]
}

Rules:
- Generate exactly 6 content slides.
- Each slide MUST contain 4 to 6 concise, high-impact bullet points.
- Output pure valid JSON starting with { and ending with }.
`

const formatMarkdown = (data, pptUrl) => {
	const slideCount = Array.isArray(data.slides) ? data.slides.length : 0

	let md = `# ${data.title || "Generated Presentation"}\n`
	if (data.subtitle) {
		md += `*${data.subtitle}*\n\n`
	} else {
		md += `\n`
	}

	md += `**${slideCount} slides generated**\n\n`

	if (Array.isArray(data.slides)) {
		data.slides.forEach((s, idx) => {
			md += `## ${idx + 1}. ${s.title}\n`
			if (Array.isArray(s.points)) {
				s.points.forEach((p) => {
					md += `- ${p}\n`
				})
			}
			md += `\n`
		})
	}

	if (pptUrl) {
		md += `[PPT_DOCUMENT](${pptUrl})\n`
	}
	if (data) {
		md += `<!-- ppt_data:${JSON.stringify(data)} -->\n`
	}
	return md.trim()
}


export const pptagent = async (state) => {
	const prompt = String(state?.prompt || "").trim()

	if (!prompt) {
		return {
			aiResponse: "Please specify a topic or presentation requirement to generate PowerPoint slides.",
			images: []
		}
	}

	try {
		const model = getModel("chat")
		const response = await model.invoke([
			["system", systemPrompt],
			["human", prompt]
		])

		const rawContent = Array.isArray(response.content)
			? response.content.map((part) => (typeof part === "string" ? part : part?.text || "")).join("")
			: String(response.content || "")

		const cleanedJson = rawContent
			.replace(/^```(?:json)?\s*/i, "")
			.replace(/\s*```$/, "")
			.trim()

		let jsonText = cleanedJson
		const firstBrace = cleanedJson.indexOf("{")
		const lastBrace = cleanedJson.lastIndexOf("}")
		if (firstBrace !== -1 && lastBrace > firstBrace) {
			jsonText = cleanedJson.slice(firstBrace, lastBrace + 1)
		}

		let data = null
		try {
			data = JSON.parse(jsonText)
		} catch {
			data = null
		}

		if (data && data.title && Array.isArray(data.slides)) {
			const base64Data = await generatePpt(data)
			const pptUrl = `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;filename=presentation.pptx;base64,${base64Data}`

			return {
				aiResponse: formatMarkdown(data, pptUrl),
				images: []
			}
		}

		return {
			aiResponse: rawContent,
			images: []
		}
	} catch (error) {
		console.error("PPT Agent execution error:", error)
		return {
			aiResponse: "Could not generate the PowerPoint presentation. Please try again with a clearer prompt.",
			images: []
		}
	}
}