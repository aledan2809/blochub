import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// POST — execute import (Step 4)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const importSession = await db.importSession.findUnique({
      where: { id: sessionId },
    })

    if (!importSession || importSession.userId !== (session!.user as any).id) {
      return NextResponse.json({ error: 'Sesiune negăsită' }, { status: 404 })
    }

    if (importSession.status !== 'READY') {
      return NextResponse.json(
        { error: 'Sesiunea nu este validată. Rulați validarea mai întâi.' },
        { status: 400 }
      )
    }

    // Mark as processing
    await db.importSession.update({
      where: { id: sessionId },
      data: { status: 'PROCESSING', stepCurent: 4 },
    })

    const rows: Record<string, any>[] = JSON.parse(importSession.parsedDataJson || '[]')
    const asociatieId = importSession.asociatieId

    // Get existing apartments to skip duplicates
    const existingApts = await db.apartament.findMany({
      where: { asociatieId },
      select: { numar: true },
    })
    const existingNums = new Set(existingApts.map((a) => a.numar))

    let createdCount = 0
    let skippedCount = 0
    const errors: Array<{ row: number; message: string }> = []

    // Process in transaction
    await db.$transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const numar = String(row.numar).trim()

        if (!numar) {
          skippedCount++
          continue
        }

        if (existingNums.has(numar)) {
          skippedCount++
          continue
        }

        try {
          // Determine tipUnitate
          let tipUnitate: any = 'APARTAMENT'
          const tipRaw = String(row.tipUnitate || '').toUpperCase().trim()
          if (['PARCARE', 'BOXA', 'SPATIU_COMERCIAL', 'ALTUL'].includes(tipRaw)) {
            tipUnitate = tipRaw
          }

          // Create apartment/unit
          const apartament = await tx.apartament.create({
            data: {
              numar,
              tipUnitate,
              asociatieId,
              etaj: row.etaj && !isNaN(Number(row.etaj)) ? Number(row.etaj) : null,
              suprafata: row.suprafata && !isNaN(Number(row.suprafata)) ? Number(row.suprafata) : null,
              nrCamere: row.nrCamere && !isNaN(Number(row.nrCamere)) ? Number(row.nrCamere) : null,
              cotaIndiviza: row.cotaIndiviza && !isNaN(Number(row.cotaIndiviza)) ? Number(row.cotaIndiviza) : null,
              nrPersoane: row.nrPersoane && !isNaN(Number(row.nrPersoane)) ? Number(row.nrPersoane) : 1,
              nrCadastral: row.nrCadastral ? String(row.nrCadastral).trim() : null,
            },
          })

          // Create owner if proprietarNume + email provided
          if (row.proprietarNume && row.email) {
            const email = String(row.email).trim().toLowerCase()
            const name = String(row.proprietarNume).trim()

            // Find or create user
            let user = await tx.user.findUnique({ where: { email } })
            if (!user) {
              user = await tx.user.create({
                data: {
                  email,
                  name,
                  phone: row.telefon ? String(row.telefon).trim() : null,
                  role: 'PROPRIETAR',
                },
              })
            }

            // Link owner to apartment
            await tx.proprietarApartament.create({
              data: {
                userId: user.id,
                apartamentId: apartament.id,
                cotaParte: 100,
                esteActiv: true,
              },
            })
          }

          // Create meters if provided
          if (row.serieContorApaRece || row.indexApaRece) {
            const contor = await tx.contor.create({
              data: {
                apartamentId: apartament.id,
                tip: 'APA_RECE',
                serie: row.serieContorApaRece ? String(row.serieContorApaRece).trim() : null,
                unitateMasura: 'mc',
                esteActiv: true,
              },
            })

            if (row.indexApaRece && !isNaN(Number(row.indexApaRece))) {
              const now = new Date()
              await tx.indexContor.create({
                data: {
                  contorId: contor.id,
                  apartamentId: apartament.id,
                  valoare: Number(row.indexApaRece),
                  dataIndex: now,
                  luna: now.getMonth() + 1,
                  an: now.getFullYear(),
                },
              })
            }
          }

          if (row.serieContorApaCalda || row.indexApaCalda) {
            const contor = await tx.contor.create({
              data: {
                apartamentId: apartament.id,
                tip: 'APA_CALDA',
                serie: row.serieContorApaCalda ? String(row.serieContorApaCalda).trim() : null,
                unitateMasura: 'mc',
                esteActiv: true,
              },
            })

            if (row.indexApaCalda && !isNaN(Number(row.indexApaCalda))) {
              const now = new Date()
              await tx.indexContor.create({
                data: {
                  contorId: contor.id,
                  apartamentId: apartament.id,
                  valoare: Number(row.indexApaCalda),
                  dataIndex: now,
                  luna: now.getMonth() + 1,
                  an: now.getFullYear(),
                },
              })
            }
          }

          createdCount++
          existingNums.add(numar)
        } catch (rowError) {
          errors.push({
            row: i + 1,
            message: rowError instanceof Error ? rowError.message : 'Eroare necunoscută',
          })
          skippedCount++
        }
      }
    })

    // Update session
    await db.importSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        createdCount,
        skippedCount,
        completedAt: new Date(),
      },
    })

    // Audit log
    await logAudit({
      userId: (session!.user as any).id,
      userName: (session!.user as any).name || (session!.user as any).email || undefined,
      actiune: 'IMPORT_APARTAMENTE',
      entitate: 'ImportSession',
      entitatId: sessionId,
      valoriNoi: { createdCount, skippedCount, fileName: importSession.numeFisier },
      notaExplicativa: `Import din ${importSession.numeFisier}: ${createdCount} create, ${skippedCount} ignorate`,
      asociatieId,
    })

    return NextResponse.json({
      success: true,
      createdCount,
      skippedCount,
      errors,
    })
  } catch (error) {
    console.error('Import execute error:', error)

    // Mark as failed
    const { sessionId } = await params
    await db.importSession.update({
      where: { id: sessionId },
      data: { status: 'FAILED' },
    }).catch(() => {})

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Eroare la executarea importului' },
      { status: 500 }
    )
  }
}
