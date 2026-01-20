// Agent exports and registration
import { AgentFactory } from './base'
import { ocrFacturaAgent } from './ocr-factura'
import { ocrIndexAgent } from './ocr-index'
import { calculChitantaAgent } from './calcul-chitanta'
import { predictiePlataAgent } from './predictie-plata'
import { chatbotAgent } from './chatbot'
import { reminderAgent } from './reminder'

// Register all agents
AgentFactory.register(ocrFacturaAgent)
AgentFactory.register(ocrIndexAgent)
AgentFactory.register(calculChitantaAgent)
AgentFactory.register(predictiePlataAgent)
AgentFactory.register(chatbotAgent)
AgentFactory.register(reminderAgent)

// Export factory and agents
export { AgentFactory } from './base'
export type { AgentInput, AgentOutput, AgentContext } from './base'

export {
  ocrFacturaAgent,
  ocrIndexAgent,
  calculChitantaAgent,
  predictiePlataAgent,
  chatbotAgent,
  reminderAgent,
}

// Convenience function to run agents
export async function runAgent(
  type: 'OCR_FACTURA' | 'OCR_INDEX' | 'CALCUL_CHITANTA' | 'PREDICTIE_PLATA' | 'CHATBOT' | 'REMINDER',
  input: Record<string, any>,
  context?: { asociatieId?: string; userId?: string }
) {
  return AgentFactory.run(type as any, input, context)
}
