import { AgentType, TipCheltuiala } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput } from './base'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface FacturaExtractedData {
  furnizor: string
  cui?: string
  numarFactura: string
  dataFactura: string
  dataScadenta?: string
  suma: number
  tva?: number
  tipCheltuiala: TipCheltuiala
  descriere?: string
  detaliiServicii?: string[]
}

export class OCRFacturaAgent extends BaseAgent {
  type = AgentType.OCR_FACTURA
  name = 'OCR Factura Agent'
  description = 'Extrage automat date din imagini de facturi folosind AI vision'

  protected async execute(input: AgentInput): Promise<AgentOutput> {
    const { imageUrl, imageBase64 } = input

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

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Ești un expert în extragerea datelor din facturi românești pentru asociații de proprietari.

Extrage următoarele informații din imaginea facturii:
- Nume furnizor
- CUI furnizor (dacă vizibil)
- Număr factură
- Data factură (format: YYYY-MM-DD)
- Data scadență (dacă vizibilă, format: YYYY-MM-DD)
- Suma totală (în lei, doar numărul)
- TVA (dacă vizibil)
- Tip cheltuială (una din: APA_RECE, APA_CALDA, CANALIZARE, GAZ, CURENT_COMUN, CALDURA, ASCENSOR, CURATENIE, GUNOI, FOND_RULMENT, FOND_REPARATII, ADMINISTRARE, ALTE_CHELTUIELI)
- Descriere servicii

Răspunde DOAR în format JSON valid, fără alte explicații.`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extrage datele din această factură:' },
              imageContent,
            ],
          },
        ],
        max_tokens: 1000,
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

      const extractedData: FacturaExtractedData = JSON.parse(jsonMatch[0])

      // Validate required fields
      if (!extractedData.furnizor || !extractedData.numarFactura || !extractedData.suma) {
        return {
          success: false,
          error: 'Missing required fields in extracted data',
          data: extractedData,
        }
      }

      return {
        success: true,
        data: {
          ...extractedData,
          confidence: 0.85, // Could be calculated based on response
          ocrExtracted: true,
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

export const ocrFacturaAgent = new OCRFacturaAgent()
