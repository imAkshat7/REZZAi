import { getModel } from "../config/llmmodel.js"

const systemPrompt = `
You are REZZAi Coding Agent, a senior software engineer.

Help the user generate code, debug errors, design APIs, build features, and
understand technical decisions. First understand the user's actual goal and
work with the code or error they provide.

Response rules:
- Give a direct solution before lengthy explanation.
- STRICT SINGLE LANGUAGE CONTINUITY: Always maintain strict language continuity with the previous conversation messages. When explaining code, answering follow-up questions (e.g. "explain each line", "how does this work", "break down the code"), or making modifications, ONLY explain or write code in the SINGLE programming language that was previously discussed (or JavaScript if none was specified). NEVER list explanations or code snippets in multiple programming languages (e.g., Python, C++, Java, C#) in the same response unless the user explicitly requested a multi-language comparison.
- Use fenced markdown code blocks with the correct language identifier.
- Make code complete and runnable when possible; do not use unexplained
  placeholders when the required context is available.
- For debugging, explain the root cause and show the corrected code.
- Mention assumptions briefly when required information is missing.
- Never claim that you ran, tested, or changed code when you did not.
- Do not identify yourself as ChatGPT, GPT, or OpenAI. You are REZZAi.
`

const reviewSystemPrompt = `
You are REZZAi's code review and debugging agent.

Review, debug, or explain the code supplied in the conversation.
Return Markdown only. Never return the files JSON schema and never generate a project or list of project files for this intent.

Rules:
- STRICT SINGLE LANGUAGE CONTINUITY: Focus exclusively on the single programming language previously discussed in the conversation history (or JavaScript if unspecified). NEVER explain or output code in multiple programming languages.
- If the user asks for a line-by-line explanation (e.g. "explain each line"), provide a clear, concise breakdown of each line for that single language only.
- For code reviews and debugging, explain the root cause clearly and identify concrete problems, risks, bugs, and improvements.
- Preserve the user's stack and conventions.
- Do not claim to have run, tested, or changed anything.
`

const generationSystemPrompt = `
You are REZZAi's code generation agent.

Generate the requested web application as separate, complete, runnable files:
1. "index.html": Structure and markup. Must include <link rel="stylesheet" href="style.css"> in the <head> and <script src="script.js" defer></script> before </body>.
2. "style.css": Styling rules, layout (Flexbox/Grid), CSS variables, hover/focus effects, and responsive design.
3. "script.js": Interactive logic, event listeners, state, and DOM manipulation.

Rules:
- Unless the user explicitly requests another stack (e.g., React, Vue, Python), ALWAYS separate web projects into "index.html", "style.css", and "script.js".
- Topic-Specific Unsplash Images: Whenever the generated website includes hero banners, cards, user avatars, gallery items, or background imagery:
  * ALWAYS use real, high-resolution Unsplash image URLs that directly match the site's topic (e.g., for a cafe/bakery use coffee & pastry photos, for real estate use modern architecture photos, for tech/portfolio use clean workspace photos).
  * Use valid Unsplash photo URL structures like:
    - "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80" (Food & Dining)
    - "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80" (Coffee & Cafe)
    - "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80" (Tech & Business)
    - "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" (Travel & Nature)
    - "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" (People & Avatars)
  * NEVER output broken local paths like "image.jpg", "hero.png", "placeholder.svg", or empty src="". ALWAYS provide full, active Unsplash URLs relevant to the requested topic.
- Make code complete, modern, beautifully styled, and fully working; do not use placeholders or incomplete comments.
- For non-web requests (e.g. Python, C++), use appropriate filenames like "main.py" or "solution.cpp".



Return ONLY valid JSON. Do not wrap it in markdown fences or add any explanation or extra text. The output must start with { and end with }.
Never mention or return the user's intent. Never return markdown code fences.
Use exactly this schema:
{
    "files": [
        {
            "path": "index.html",
            "content": "<!DOCTYPE html>..."
        },
        {
            "path": "style.css",
            "content": "/* styles */..."
        },
        {
            "path": "script.js",
            "content": "// JavaScript logic..."
        }
    ]
}
`

const allowedIntents = new Set([
    "code_generation",
    "code review",
    "explanation",
    "optimization",
    "conversion",
    "documentation"
])

const getResponseText = (content) => Array.isArray(content)
    ? content.map((part) => typeof part === "string" ? part : part?.text || "").join("")
    : String(content || "")

const parseJson = (text) => {
    const cleaned = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim()

    try {
        return JSON.parse(cleaned)
    } catch {
        return null
    }
}

const parseIntent = (content) => {
    const text = getResponseText(content).trim()
    const result = parseJson(text)
    const intent = result?.intent || text.replace(/["'`]/g, "").trim()

    return allowedIntents.has(intent) ? intent : "explanation"
}

const getLatestUserPrompt = (state) => {
    const latestUserMessage = [...(state?.memory || [])]
        .reverse()
        .find((message) => message.role === "user")

    return String(latestUserMessage?.content || state?.prompt || "").trim()
}

const isExplicitGenerationRequest = (prompt) => {
    if (!prompt || typeof prompt !== "string") return false
    const text = prompt.trim().toLowerCase()

    const hasPreview = /\b(preview|with preview|canvas|live preview|interactive|demo)\b/i.test(text)
    if (hasPreview) return true

    const hasAppNoun = /\b(website|web app|webapp|application|landing page|portfolio|dashboard|calculator|todo|game|dice|quiz|e-commerce|storefront|site|ui|widget|tool|project)\b/i.test(text)
    const hasBuildVerb = /\b(build|create|generate|make|develop|design|code)\b/i.test(text)
    const hasMultiFileExplicit = /\b(html\s+css\s+js|html,?\s*css|full project|multi-file project|frontend)\b/i.test(text)
    const isSimpleSnippet = /\b(hello world|console\.log|reverse|algorithm|how to|explain|fix|debug|log|print|example|what is|why does)\b/i.test(text)

    if (isSimpleSnippet && !hasAppNoun && !hasMultiFileExplicit && !hasPreview) return false

    return (hasBuildVerb && hasAppNoun) || hasMultiFileExplicit || (hasAppNoun && text.length > 15)
}


const parseGeneratedFiles = (content) => {
    const result = parseJson(getResponseText(content))
    const files = Array.isArray(result?.files) ? result.files : []

    return files
        .filter((file) => file && typeof file.path === "string" && typeof file.content === "string")
        .map((file) => ({ path: file.path, content: file.content }))
}

const getHistory = (memory) => (memory || [])
    .slice(-10)
    .map((message) => [
        message.role === "assistant" ? "ai" : "human",
        String(message.content || "").slice(0, 2400)
    ])

export const codingagent = async (state) => {
    const history = getHistory(state?.memory)
    if (history.length === 0) {
        history.push(["human", String(state?.prompt || "")])
    }

    const model = getModel("coding")
    const intentResponse = await model.invoke([
        ["system", `Classify the user's primary intent. Return only valid JSON with exactly one key, "intent". The value must be exactly one of: ${[...allowedIntents].join(", ")}.`],
        ...history
    ])
    const detectedIntent = parseIntent(intentResponse.content)
    const latestPrompt = getLatestUserPrompt(state)
    const intent = isExplicitGenerationRequest(latestPrompt)
        ? "code_generation"
        : (detectedIntent === "code_generation" ? "explanation" : detectedIntent)

    if (intent === "code_generation") {
        const response = await model.invoke([

            ["system", generationSystemPrompt],
            ...history
        ])
        const files = parseGeneratedFiles(response.content)

        return {
            aiResponse: JSON.stringify({ files }),
            intent
        }
    }

    const response = await model.invoke([
        ["system", intent === "code review" ? reviewSystemPrompt : systemPrompt],
        ...history
    ])

    return {
        aiResponse: getResponseText(response.content),
        intent
    }
}