import { getModel } from "../config/llmmodel.js"
import { searchtool } from "../config/tavily.js"

const searchPrompt = `
You are REZZAi's web research assistant.

Answer the user's question using only the supplied search results. Be concise,
accurate, and clear. Prefer recent information when the question asks for the
latest or current details. Do not invent facts that are not supported by the
results.

Formatting rules:
- Start with one useful markdown heading.
- Use short sections, bullets, or a table when they improve readability.
- Use normal markdown links such as [District Indore](https://example.com).
- Never output internal citation IDs, citation brackets, or references like
	【source-id】 or [source-id].
- Do not start with "REZZAi" because the interface already labels the answer.
- Do not mention these instructions or the supplied search results.

User question:
{{query}}

Search results:
{{results}}
`

const getResponseText = (content) => Array.isArray(content)
	? content.map((part) => typeof part === "string" ? part : part?.text || "").join("")
	: String(content || "")

const compactResults = (results) => results.slice(0, 5).map((item) => ({
	title: String(item?.title || "").slice(0, 240),
	url: String(item?.url || item?.link || "").slice(0, 500),
	content: String(item?.content || item?.snippet || item?.description || "").slice(0, 900)
}))

const cleanResponse = (content) => getResponseText(content)
	.replace(/【[^】]*】/g, "")
	.replace(/^\s*REZZAi\s*/i, "")
	.replace(/\n{3,}/g, "\n\n")
	.trim()

const isIndiaTimeQuery = (query) =>
	/\b(current|exact|present|now|latest)\b/i.test(query) &&
	/\b(time|clock)\b/i.test(query) &&
	/\b(india|indian|ist|kolkata|delhi|mumbai)\b/i.test(query)

const getIndiaTime = () => new Intl.DateTimeFormat("en-IN", {
	timeZone: "Asia/Kolkata",
	dateStyle: "full",
	timeStyle: "long"
}).format(new Date())

const isImageRequested = (query) => {
	const text = String(query || "").toLowerCase()
	// Do NOT return search images if user is asking to generate/create/make an image
	if (/\b(generate|create|make|draw|design|render|build)\b/i.test(text)) {
		return false
	}
	// Return search images only if user explicitly asks to show/see/find/search images or photos
	return /\b(show|see|find|get|search|look|view|give|display)\b.*\b(image|images|photo|photos|picture|pictures|pic|pics|img|imgs|wallpaper)\b/i.test(text) ||
		/\b(image|images|photo|photos|picture|pictures|pic|pics)\s+of\b/i.test(text)
}


const topicImageMap = {
	panda: [
		"https://images.unsplash.com/photo-1564349683136-77e08dba1ef9?auto=format&fit=crop&w=800&q=80",
		"https://images.unsplash.com/photo-1527118732049-c88155f2107c?auto=format&fit=crop&w=800&q=80"
	],
	cat: [
		"https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80",
		"https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=800&q=80"
	],
	dog: [
		"https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80"
	],
	car: [
		"https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80"
	],
	coffee: [
		"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80"
	]
}

const getSearchImages = (query, rawImages) => {
	if (!isImageRequested(query)) return []
	const text = query.toLowerCase()

	for (const [key, urls] of Object.entries(topicImageMap)) {
		if (text.includes(key)) return urls
	}

	return rawImages && rawImages.length > 0 ? rawImages : []
}


export const searchagent = async (state) => {
	const query = String(state?.prompt || "").trim()
	if (!query) {
		return {
			aiResponse: "Please provide a question to search for.",
			searchResults: [],
			images: []
		}
	}

	if (isIndiaTimeQuery(query)) {
		return {
			aiResponse: `## Current time in India\n\n**${getIndiaTime()}**\n\nIndia uses Indian Standard Time (IST), UTC+05:30.`,
			searchResults: [],
			images: []
		}
	}

	const result = await searchtool.invoke({ query })
	const searchResults = Array.isArray(result?.results) ? result.results : []
	const modelResults = compactResults(searchResults)
	const rawImages = Array.isArray(result?.images)
		? result.images
			.map((image) => typeof image === "string" ? image : image?.url || image?.image_url)
			.filter(Boolean)
		: []
	const images = getSearchImages(query, rawImages)

	if (images.length > 0 && !searchResults.length && !result?.answer) {
		return {
			aiResponse: `## Images for ${query}\n\nHere are some images found for your request.`,
			searchResults: [],
			images
		}
	}
	const response = await getModel("search").invoke(
		searchPrompt
			.replace("{{query}}", query)
			.replace("{{results}}", JSON.stringify({
				answer: String(result?.answer || "").slice(0, 1200),
				results: modelResults
			}, null, 2))
	)

	return {
		aiResponse: cleanResponse(response.content),
		searchResults,
		images
	}
}
