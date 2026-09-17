import { StateGraph } from "@langchain/langgraph"
import { AgentState } from "./state.js"
import { router } from "./router.js"
import { chatagent } from "../agents/chat.agent.js"
import { pdfagent } from "../agents/pdf.agent.js"
import { pptagent } from "../agents/ppt.agent.js"
import { searchagent } from "../agents/search.agent.js"
import { codingagent } from "../agents/coding.agents.js"
import { imageagent } from "../agents/image agent.js"
import { imageAnalyzer } from "../agents/imageanalizer.agent.js"
import { pdfRag } from "../agents/pdfRag.agent.js"

const workflow = new StateGraph(AgentState)

workflow.addNode("router", router)
workflow.addNode("chat", chatagent)
workflow.addNode("pdf", pdfagent)
workflow.addNode("ppt", pptagent)
workflow.addNode("search", searchagent)
workflow.addNode("coding", codingagent)
workflow.addNode("imageGen", imageagent)
workflow.addNode("pdfRag", pdfRag)
workflow.addNode("imageAnalyzer", imageAnalyzer)

workflow.addEdge("__start__", "router")
workflow.addConditionalEdges("router", (state) => {
    const agent = state.agent

    return ["chat", "search", "pdf", "ppt", "imageGen", "coding", "pdfRag", "imageAnalyzer"].includes(agent)
        ? agent
        : "chat"
},{
    chat: "chat",
    search: "search",
    pdf: "pdf",
    ppt: "ppt",
    imageGen: "imageGen",
    coding: "coding",
    pdfRag: "pdfRag",
    imageAnalyzer: "imageAnalyzer"
})

workflow.addEdge("chat", "__end__")
workflow.addEdge("search", "__end__")
workflow.addEdge("pdf", "__end__")
workflow.addEdge("ppt", "__end__")
workflow.addEdge("imageGen", "__end__")
workflow.addEdge("coding", "__end__")
workflow.addEdge("pdfRag", "__end__")
workflow.addEdge("imageAnalyzer", "__end__")

export const graph = workflow.compile()