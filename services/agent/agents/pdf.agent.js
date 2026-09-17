import { getModel } from "../config/llmmodel.js"
import { generatePdf } from "../utils/generatepdf.js"

const systemPrompt = `
You are an expert document writer.

Return ONLY valid JSON.
Do NOT return markdown code fences (such as \`\`\`json), do NOT return any explanations, introductory text, or commentary.

JSON Structure:
{
  "title": "Document Title",
  "subtitle": "Document Subtitle",
  "sections": [
    {
      "heading": "Section Heading",
      "points": [
        "Concise point 1",
        "Concise point 2",
        "Concise point 3"
      ]
    }
  ]
}

Rules:
- Generate 4 to 6 focused sections.
- Each section MUST contain 3 to 4 concise, high-impact bullet points.
- Output pure valid JSON starting with { and ending with }.
`

const formatMarkdown = (data, pdfUrl) => {
	let md = `# ${data.title || "Generated Document"}\n`
	if (data.subtitle) {
		md += `*${data.subtitle}*\n\n`
	} else {
		md += `\n`
	}
	md += `Your PDF document has been compiled. Click the Canvas card below or use the side screen to view and download it.\n\n`
	if (pdfUrl) {
		md += `[PDF_DOCUMENT](${pdfUrl})\n`
	}
	return md.trim()
}

export const pdfagent = async (state) => {
	const prompt = String(state?.prompt || "").trim()

	if (!prompt) {
		return {
			aiResponse: "Please specify a topic or document requirement to generate a PDF.",
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

		if (data && data.title && Array.isArray(data.sections)) {
			const pdfBuffer = await generatePdf(data)
			const base64 = pdfBuffer.toString("base64")
			const pdfUrl = `data:application/pdf;filename=document.pdf;base64,${base64}`

			return {
				aiResponse: formatMarkdown(data, pdfUrl),
				images: []
			}
		}

		return {
			aiResponse: rawContent,
			images: []
		}
	} catch (error) {
		console.error("PDF Agent execution error:", error)
		return {
			aiResponse: "Could not generate the PDF document. Please try again with a clearer prompt.",
			images: []
		}
	}
}