import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../config/llmmodel.js"
import fs from "node:fs"

const systemPrompt = `You are REZZAi Image Analyzer Agent.

Rules:
- Analyze only the uploaded image.
- Answer user's question accurately.
- If charts or tables exist in the image, explain them clearly and thoroughly.
- If something is unclear, unreadable, or not present in the image, say so clearly.
- Use markdown formatting (headings, bullet points, code blocks, or markdown tables) when helpful.
- Do not hallucinate or state details not visible in the image.`

export const imageAnalyzer = async (state) => {
    const prompt = String(state?.prompt || "Analyze this image").trim()
    const file = state?.file

    if (!file) {
        return {
            aiResponse: "Please upload an image for me to analyze.",
            images: []
        }
    }

    try {
        const model = getModel("imageAnalyzer")
        let imageUrl = ""

        if (file.buffer) {
            const base64Image = file.buffer.toString("base64")
            const mimeType = file.mimetype || "image/png"
            imageUrl = `data:${mimeType};base64,${base64Image}`
        } else if (file.path && fs.existsSync(file.path)) {
            const buffer = fs.readFileSync(file.path)
            const base64Image = buffer.toString("base64")
            const mimeType = file.mimetype || "image/png"
            imageUrl = `data:${mimeType};base64,${base64Image}`
        } else {
            return {
                aiResponse: "Uploaded image file content is invalid.",
                images: []
            }
        }

        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage({
                content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: imageUrl } }
                ]
            })
        ]

        const response = await model.invoke(messages)

        const rawContent = Array.isArray(response.content)
            ? response.content.map((part) => (typeof part === "string" ? part : part?.text || "")).join("")
            : String(response.content || "")

        return {
            aiResponse: rawContent.trim(),
            images: []
        }
    } catch (error) {
        console.error("Image Analyzer Agent error:", error)
        return {
            aiResponse: "Could not analyze the uploaded image. Please make sure the image is valid and try again.",
            images: []
        }
    } finally {
        if (file && file.path && fs.existsSync(file.path)) {
            try {
                fs.unlinkSync(file.path)
            } catch (unlinkError) {
                console.error("Failed to delete uploaded temp file:", unlinkError)
            }
        }
    }
}
