// ai-router package not installed — stub implementation
// TODO: install ai-router when ready to use AI features

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  model?: string
  provider?: string
  usage?: { promptTokens: number; completionTokens: number }
  tokenUsage?: { total: number; prompt: number; completion: number }
}

export const aiRouter = {
  chat: async (_opts: { messages: AIMessage[]; maxTokens?: number; temperature?: number; jsonMode?: boolean }): Promise<AIResponse> => {
    console.warn('[AI Router] Not configured — returning stub response')
    return { content: 'AI router not configured' }
  },
}

export async function aiChat(
  messages: AIMessage[],
  options?: { maxTokens?: number; temperature?: number; jsonMode?: boolean }
): Promise<AIResponse> {
  return aiRouter.chat({ messages, ...options })
}
