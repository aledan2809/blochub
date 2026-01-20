import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { runAgent } from '@/agents'

const ocrFacturaSchema = z.object({
  type: z.literal('factura'),
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  asociatieId: z.string(),
})

const ocrIndexSchema = z.object({
  type: z.literal('index'),
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  tipContor: z.enum(['APA_RECE', 'APA_CALDA', 'GAZ', 'CURENT', 'CALDURA']).optional(),
  indexAnterior: z.number().optional(),
  contorId: z.string().optional(),
})

const ocrSchema = z.discriminatedUnion('type', [ocrFacturaSchema, ocrIndexSchema])

// POST OCR processing
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = ocrSchema.parse(body)

    if (!data.imageUrl && !data.imageBase64) {
      return NextResponse.json(
        { error: 'Either imageUrl or imageBase64 is required' },
        { status: 400 }
      )
    }

    let result

    if (data.type === 'factura') {
      result = await runAgent(
        'OCR_FACTURA',
        {
          imageUrl: data.imageUrl,
          imageBase64: data.imageBase64,
        },
        {
          asociatieId: data.asociatieId,
          userId: (session.user as any).id,
        }
      )
    } else {
      result = await runAgent(
        'OCR_INDEX',
        {
          imageUrl: data.imageUrl,
          imageBase64: data.imageBase64,
          tipContor: data.tipContor,
          indexAnterior: data.indexAnterior,
        },
        {
          userId: (session.user as any).id,
        }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'OCR processing failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error in OCR:', error)
    return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 })
  }
}
