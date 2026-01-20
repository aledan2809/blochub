import { AgentType } from '@prisma/client'
import { db } from '@/lib/db'

export interface AgentInput {
  [key: string]: any
}

export interface AgentOutput {
  success: boolean
  data?: any
  error?: string
}

export interface AgentContext {
  asociatieId?: string
  userId?: string
  apartamentId?: string
}

export abstract class BaseAgent {
  abstract type: AgentType
  abstract name: string
  abstract description: string

  protected startTime: number = 0
  protected context: AgentContext = {}

  async run(input: AgentInput, context: AgentContext = {}): Promise<AgentOutput> {
    this.startTime = Date.now()
    this.context = context

    let output: AgentOutput
    let tokensUsed: number | undefined
    let cost: number | undefined

    try {
      output = await this.execute(input)
    } catch (error: any) {
      output = {
        success: false,
        error: error.message || 'Unknown error occurred',
      }
    }

    // Log agent activity
    const durationMs = Date.now() - this.startTime

    await this.log({
      input: JSON.stringify(input),
      output: JSON.stringify(output),
      success: output.success,
      errorMsg: output.error,
      durationMs,
      tokensUsed,
      cost,
    })

    return output
  }

  protected abstract execute(input: AgentInput): Promise<AgentOutput>

  private async log(data: {
    input: string
    output: string
    success: boolean
    errorMsg?: string
    durationMs: number
    tokensUsed?: number
    cost?: number
  }) {
    try {
      await db.agentLog.create({
        data: {
          agentType: this.type,
          asociatieId: this.context.asociatieId,
          userId: this.context.userId,
          ...data,
        },
      })
    } catch (error) {
      console.error('Failed to log agent activity:', error)
    }
  }
}

// Agent factory
export class AgentFactory {
  private static agents: Map<AgentType, BaseAgent> = new Map()

  static register(agent: BaseAgent) {
    this.agents.set(agent.type, agent)
  }

  static get(type: AgentType): BaseAgent | undefined {
    return this.agents.get(type)
  }

  static async run(
    type: AgentType,
    input: AgentInput,
    context: AgentContext = {}
  ): Promise<AgentOutput> {
    const agent = this.get(type)
    if (!agent) {
      return {
        success: false,
        error: `Agent type ${type} not found`,
      }
    }
    return agent.run(input, context)
  }
}
