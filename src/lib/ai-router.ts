import { AIRouter, getProjectPreset } from "ai-router"
import type { AIMessage, AIResponse } from "ai-router"

// Singleton router instance for server-side usage (agents, etc.)
const preset = getProjectPreset("blochub")

export const aiRouter = new AIRouter({
  ...preset,
  maxRetries: 2,
  retryDelayMs: 2000,
})

/**
 * Helper: call AI with messages array, returns content string.
 * Uses ai-router round-robin with fallback instead of direct OpenAI calls.
 */
export async function aiChat(
  messages: AIMessage[],
  options?: {
    maxTokens?: number
    temperature?: number
    jsonMode?: boolean
  }
): Promise<AIResponse> {
  return aiRouter.chat({
    messages,
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
    jsonMode: options?.jsonMode,
  })
}

export type { AIMessage, AIResponse }
