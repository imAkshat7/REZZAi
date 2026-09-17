import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const pdfParseModule = require("pdf-parse")

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { getModel } from "../config/llmmodel.js"
import { addDocumentsToQdrant, getQdrantVectorStore, hasQdrantCollection } from "../config/VectorDb.js"
import fs from "node:fs"

const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
})

const extractPdfText = async (pdfBuffer) => {
    const PDFClass = pdfParseModule.PDFParse || (typeof pdfParseModule === "function" ? pdfParseModule : pdfParseModule.default)

    if (typeof PDFClass === "function") {
        try {
            const parser = new PDFClass({ data: pdfBuffer })
            if (typeof parser.getText === "function") {
                const textData = await parser.getText()
                const text = typeof textData === "string" ? textData : (textData?.text || "")
                const numPages = textData?.total || textData?.pages?.length || 1
                return { text, numPages }
            }
        } catch (e) {
            if (typeof pdfParseModule === "function") {
                const data = await pdfParseModule(pdfBuffer)
                return { text: data.text || "", numPages: data.numpages || 1 }
            }
            throw e
        }
    }

    if (typeof pdfParseModule === "function") {
        const data = await pdfParseModule(pdfBuffer)
        return { text: data.text || "", numPages: data.numpages || 1 }
    }

    throw new Error("Unable to parse PDF with pdf-parse library.")
}

const systemPrompt = `You are REZZAi PDF RAG Agent.

Rules:
- Answer the user's question accurately based ONLY on the provided context retrieved from the uploaded PDF document and conversation history.
- If the answer cannot be found in the provided context, state clearly: "I could not find the answer to your question in the uploaded PDF."
- Do not make up facts or hallucinate details outside the provided PDF content.
- Use clear markdown formatting (headings, bullet points, code snippets, tables) when helpful.`

export const pdfRag = async (state) => {
    const prompt = String(state?.prompt || "Summarize this PDF document").trim()
    const file = state?.file
    const conversationId = state?.conversationId || "default-session"
    const collectionName = `pdf-${conversationId}`.toLowerCase().replace(/[^a-z0-9_-]/g, "_")
    const memory = Array.isArray(state?.memory) ? state.memory : []

    try {
        let vectorStore = null

        if (file) {
            let pdfBuffer = null
            if (file.buffer) {
                pdfBuffer = file.buffer
            } else if (file.path && fs.existsSync(file.path)) {
                pdfBuffer = fs.readFileSync(file.path)
            }

            if (!pdfBuffer) {
                return {
                    aiResponse: "Could not read the uploaded PDF document buffer.",
                    images: []
                }
            }

            // 1. Extract raw text from PDF
            const { text: pdfText, numPages } = await extractPdfText(pdfBuffer)
            const cleanPdfText = String(pdfText || "").trim()

            if (!cleanPdfText) {
                return {
                    aiResponse: "The uploaded PDF document contains no readable text.",
                    images: []
                }
            }

            // 2. Chunk text using RecursiveCharacterTextSplitter
            const docs = await textSplitter.createDocuments(
                [cleanPdfText],
                [{ source: file.originalname || "uploaded.pdf", numPages }]
            )

            // 3. Index chunks into Qdrant Vector Store
            vectorStore = await addDocumentsToQdrant(docs, collectionName)
        } else {
            // Check if collection exists in Qdrant for this conversation
            const exists = await hasQdrantCollection(collectionName)
            if (!exists) {
                return {
                    aiResponse: "No PDF document was found for this conversation. Please upload a PDF file first.",
                    images: []
                }
            }
            vectorStore = getQdrantVectorStore(collectionName)
        }

        // 4. Retrieve relevant chunks for user's question
        const relevantDocs = await vectorStore.similaritySearch(prompt, 4)
        const contextText = relevantDocs.map((doc) => doc.pageContent).join("\n\n---\n\n")

        // Format conversation memory
        const historyText = memory.slice(-6).map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n")

        // 5. Generate answer using Gemini model
        const model = getModel("pdfRag")
        const messagesPrompt = [
            ["system", systemPrompt],
            ["human", `Previous Conversation History:\n${historyText || "None"}\n\nContext from PDF Document:\n${contextText || "No matching content"}\n\nUser Question:\n${prompt}`]
        ]

        const response = await model.invoke(messagesPrompt)

        const rawContent = Array.isArray(response.content)
            ? response.content.map((part) => (typeof part === "string" ? part : part?.text || "")).join("")
            : String(response.content || "")

        return {
            aiResponse: rawContent.trim(),
            images: []
        }
    } catch (error) {
        console.error("PDF RAG Agent error:", error)
        return {
            aiResponse: "Could not process the PDF request. Please make sure the PDF is valid and try again.",
            images: []
        }
    } finally {
        if (file && file.path && fs.existsSync(file.path)) {
            try {
                fs.unlinkSync(file.path)
            } catch (unlinkError) {
                console.error("Failed to delete temp PDF file:", unlinkError)
            }
        }
    }
}