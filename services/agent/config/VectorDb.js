import "dotenv/config"
import { QdrantVectorStore } from "@langchain/qdrant"
import { QdrantClient } from "@qdrant/js-client-rest"
import { embeddings } from "./embedding.js"

const QDRANT_URL = process.env.QDRANT_ENDPOINT || process.env.QDRANT_URL || "http://localhost:6333"
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || undefined
const DEFAULT_COLLECTION = process.env.QDRANT_COLLECTION || "rezzai-documents"

export const qdrantClient = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY
})

export const getQdrantVectorStore = (collectionName = DEFAULT_COLLECTION) => {
    return new QdrantVectorStore(embeddings, {
        client: qdrantClient,
        url: QDRANT_URL,
        apiKey: QDRANT_API_KEY,
        collectionName
    })
}

export const addDocumentsToQdrant = async (docs, collectionName = DEFAULT_COLLECTION) => {
    return await QdrantVectorStore.fromDocuments(docs, embeddings, {
        url: QDRANT_URL,
        apiKey: QDRANT_API_KEY,
        collectionName
    })
}

export const addTextsToQdrant = async (texts, metadatas = [], collectionName = DEFAULT_COLLECTION) => {
    return await QdrantVectorStore.fromTexts(texts, metadatas, embeddings, {
        url: QDRANT_URL,
        apiKey: QDRANT_API_KEY,
        collectionName
    })
}

export const getQdrantRetriever = (vectorStore, k = 4) => {
    return vectorStore.asRetriever(k)
}

export const hasQdrantCollection = async (collectionName) => {
    if (!collectionName) return false
    try {
        const res = await qdrantClient.collectionExists(collectionName)
        return Boolean(res?.exists)
    } catch (e) {
        return false
    }
}

export default getQdrantVectorStore
