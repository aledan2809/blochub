import { AgentType, TipContor } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput } from './base'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface IndexExtractedData {
  valoare: number
  tipContor?: TipContor
  serieContor?: string
  confidence: number
  warnings?: string[]
}

export class OCRIndexAgent extends BaseAgent {
  type = AgentType.OCR_INDEX
  name = 'OCR Index Contor Agent'
  description = 'Citește automat indexul de pe imaginea unui contor folosind AI vision'

  protected async execute(input: AgentInput): Promise<AgentOutput> {
    const { imageUrl, imageBase64, tipContor, indexAnterior } = input

    if (!imageUrl && !imageBase64) {
      return {
        success: false,
        error: 'Image URL or base64 required',
      }
    }

    try {
      const imageContent = imageBase64
        ? { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        : { type: 'image_url' as const, image_url: { url: imageUrl } }

      const contextInfo = []
      if (tipContor) {
        contextInfo.push(`Tip contor: ${tipContor}`)
      }
      if (indexAnterior !== undefined) {
        contextInfo.push(`Index anterior: ${indexAnterior}`)
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Ești un expert în citirea contoarelor de utilități (apă, gaz, curent electric).

Citește valoarea afișată pe contor din imagine.

Reguli:
1. Citește TOATE cifrele vizibile pe display/cadran
2. Pentru contoare cu roți, citește doar cifrele pe fundal alb/negru, ignoră zecimalele roșii
3. Pentru contoare digitale, citește exact ce afișează
4. Dacă sunt mai multe valori, citește valoarea totală/principală
5. Returnează DOAR numărul, fără unități de măsură

${contextInfo.length > 0 ? `Context:\n${contextInfo.join('\n')}` : ''}

Răspunde DOAR în format JSON:
{
  "valoare": <număr>,
  "serieContor": "<serie dacă e vizibilă>",
  "confidence": <0-100>,
  "warnings": ["<avertismente dacă există>"]
}`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Citește indexul de pe acest contor:' },
              imageContent,
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        return {
          success: false,
          error: 'No response from AI',
        }
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return {
          success: false,
          error: 'Could not parse AI response as JSON',
        }
      }

      const extractedData: IndexExtractedData = JSON.parse(jsonMatch[0])

      // Validate
      if (typeof extractedData.valoare !== 'number' || isNaN(extractedData.valoare)) {
        return {
          success: false,
          error: 'Could not extract valid index value',
        }
      }

      // Check for anomalies
      const warnings: string[] = extractedData.warnings || []

      if (indexAnterior !== undefined && extractedData.valoare < indexAnterior) {
        warnings.push(`Index citit (${extractedData.valoare}) este mai mic decât cel anterior (${indexAnterior})`)
      }

      if (indexAnterior !== undefined) {
        const diferenta = extractedData.valoare - indexAnterior
        if (tipContor === 'APA_RECE' || tipContor === 'APA_CALDA') {
          if (diferenta > 50) {
            warnings.push(`Consum foarte mare: ${diferenta} mc (verifică dacă e corect)`)
          }
        } else if (tipContor === 'GAZ') {
          if (diferenta > 500) {
            warnings.push(`Consum foarte mare: ${diferenta} mc (verifică dacă e corect)`)
          }
        }
      }

      return {
        success: true,
        data: {
          ...extractedData,
          warnings,
          tipContor,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }
}

export const ocrIndexAgent = new OCRIndexAgent()
