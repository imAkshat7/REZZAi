import { Annotation } from "@langchain/langgraph"

export const AgentState = Annotation.Root({

    prompt: Annotation(),
    conversationId: Annotation(),
    memory: Annotation(),
    aiResponse: Annotation(),
    intent: Annotation(),
    agent: Annotation(),
    searchResults:Annotation(),
    images:Annotation(),
    file:Annotation()

})