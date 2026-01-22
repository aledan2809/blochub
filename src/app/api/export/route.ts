import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

// GET - Export all data for asociatie (admin) or user data (proprietar)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const type = searchParams.get('type') || 'full' // 'full', 'chitante', 'cheltuieli', 'apartamente'

    // Check if user is admin
    const asociatie = await db.asociatie.findFirst({
      where: { adminId: userId }
    })

    let exportData: any

    if (asociatie) {
      // Admin export - all association data
      exportData = await exportAsociatieData(asociatie.id, type)
    } else {
      // Proprietar export - only their data
      exportData = await exportProprietarData(userId)
    }

    if (format === 'csv') {
      const csv = convertToCSV(exportData, type)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="export-blochub-${new Date().toISOString().split('T')[0]}.csv"`,
        }
      })
    }

    // JSON format
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="export-blochub-${new Date().toISOString().split('T')[0]}.json"`,
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Eroare la export' }, { status: 500 })
  }
}

async function exportAsociatieData(asociatieId: string, type: string) {
  const data: any = {
    exportDate: new Date().toISOString(),
    type: 'asociatie'
  }

  // Full export or specific sections
  if (type === 'full' || type === 'asociatie') {
    data.asociatie = await db.asociatie.findUnique({
      where: { id: asociatieId },
      select: {
        nume: true,
        cui: true,
        adresa: true,
        oras: true,
        judet: true,
        codPostal: true,
        email: true,
        telefon: true,
        contBancar: true,
        banca: true,
        ziScadenta: true,
        penalizareZi: true,
        createdAt: true,
      }
    })

    data.scari = await db.scara.findMany({
      where: { asociatieId },
      select: { numar: true, etaje: true }
    })
  }

  if (type === 'full' || type === 'apartamente') {
    data.apartamente = await db.apartament.findMany({
      where: { asociatieId },
      select: {
        numar: true,
        etaj: true,
        suprafata: true,
        nrCamere: true,
        cotaIndiviza: true,
        nrPersoane: true,
        scara: { select: { numar: true } },
        proprietari: {
          where: { esteActiv: true },
          select: {
            user: { select: { name: true, email: true, phone: true } },
            cotaParte: true,
            dataInceput: true
          }
        }
      }
    })
  }

  if (type === 'full' || type === 'cheltuieli') {
    data.cheltuieli = await db.cheltuiala.findMany({
      where: { asociatieId },
      orderBy: [{ an: 'desc' }, { luna: 'desc' }],
      select: {
        tip: true,
        descriere: true,
        suma: true,
        dataFactura: true,
        nrFactura: true,
        modRepartizare: true,
        luna: true,
        an: true,
        furnizor: { select: { nume: true } }
      }
    })
  }

  if (type === 'full' || type === 'chitante') {
    data.chitante = await db.chitanta.findMany({
      where: { asociatieId },
      orderBy: [{ an: 'desc' }, { luna: 'desc' }, { numar: 'desc' }],
      select: {
        numar: true,
        luna: true,
        an: true,
        sumaIntretinere: true,
        sumaRestanta: true,
        sumaPenalizare: true,
        sumaFonduri: true,
        sumaTotal: true,
        status: true,
        dataEmitere: true,
        dataScadenta: true,
        apartament: { select: { numar: true } },
        plati: {
          select: {
            suma: true,
            dataPlata: true,
            metodaPlata: true,
            status: true
          }
        }
      }
    })
  }

  if (type === 'full') {
    data.fonduri = await db.fond.findMany({
      where: { asociatieId },
      select: {
        tip: true,
        denumire: true,
        sumaLunara: true,
        soldCurent: true
      }
    })

    data.furnizori = await db.furnizor.findMany({
      where: { asociatieId },
      select: {
        nume: true,
        cui: true,
        adresa: true,
        telefon: true,
        email: true,
        contBancar: true
      }
    })
  }

  // Summary stats
  const totalPlati = await db.plata.aggregate({
    where: {
      chitanta: { asociatieId },
      status: 'CONFIRMED'
    },
    _sum: { suma: true }
  })

  const totalRestante = await db.chitanta.aggregate({
    where: {
      asociatieId,
      status: { in: ['GENERATA', 'TRIMISA', 'RESTANTA', 'PARTIAL_PLATITA'] }
    },
    _sum: { sumaTotal: true }
  })

  data.sumar = {
    totalIncasari: totalPlati._sum.suma || 0,
    totalRestante: totalRestante._sum.sumaTotal || 0,
    numarApartamente: data.apartamente?.length || 0,
    numarChitante: data.chitante?.length || 0
  }

  return data
}

async function exportProprietarData(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      phone: true,
      createdAt: true
    }
  })

  const apartamente = await db.proprietarApartament.findMany({
    where: { userId, esteActiv: true },
    include: {
      apartament: {
        include: {
          asociatie: {
            select: { nume: true, adresa: true, oras: true }
          },
          chitante: {
            orderBy: [{ an: 'desc' }, { luna: 'desc' }],
            include: {
              plati: {
                where: { userId },
                select: {
                  suma: true,
                  dataPlata: true,
                  metodaPlata: true,
                  status: true
                }
              }
            }
          }
        }
      }
    }
  })

  return {
    exportDate: new Date().toISOString(),
    type: 'proprietar',
    user,
    apartamente: apartamente.map(pa => ({
      apartament: {
        numar: pa.apartament.numar,
        etaj: pa.apartament.etaj,
        suprafata: pa.apartament.suprafata,
        cotaIndiviza: pa.apartament.cotaIndiviza,
        nrPersoane: pa.apartament.nrPersoane,
      },
      asociatie: pa.apartament.asociatie,
      cotaParte: pa.cotaParte,
      chitante: pa.apartament.chitante.map(ch => ({
        numar: ch.numar,
        luna: ch.luna,
        an: ch.an,
        sumaTotal: ch.sumaTotal,
        status: ch.status,
        plati: ch.plati
      }))
    }))
  }
}

function convertToCSV(data: any, type: string): string {
  let csv = ''

  // Header with export info
  csv += `# Export BlocHub - ${new Date().toLocaleDateString('ro-RO')}\n`
  csv += `# Tip: ${data.type}\n\n`

  if (data.chitante && (type === 'full' || type === 'chitante')) {
    csv += '## Chitanțe\n'
    csv += 'Nr,Luna,An,Apartament,Întreținere,Restanță,Penalizare,Fonduri,Total,Status\n'
    for (const ch of data.chitante) {
      csv += `${ch.numar},${ch.luna},${ch.an},"${ch.apartament?.numar || ''}",${ch.sumaIntretinere},${ch.sumaRestanta},${ch.sumaPenalizare},${ch.sumaFonduri},${ch.sumaTotal},${ch.status}\n`
    }
    csv += '\n'
  }

  if (data.cheltuieli && (type === 'full' || type === 'cheltuieli')) {
    csv += '## Cheltuieli\n'
    csv += 'Tip,Descriere,Suma,Nr Factură,Data,Luna,An,Furnizor,Mod Repartizare\n'
    for (const ch of data.cheltuieli) {
      csv += `${ch.tip},"${ch.descriere || ''}",${ch.suma},"${ch.nrFactura || ''}",${ch.dataFactura},${ch.luna},${ch.an},"${ch.furnizor?.nume || ''}",${ch.modRepartizare}\n`
    }
    csv += '\n'
  }

  if (data.apartamente && (type === 'full' || type === 'apartamente')) {
    csv += '## Apartamente\n'
    csv += 'Număr,Etaj,Suprafață,Camere,Cotă Indiviză,Persoane,Scara,Proprietar,Email\n'
    for (const apt of data.apartamente) {
      const prop = apt.proprietari?.[0]
      csv += `${apt.numar},${apt.etaj || ''},${apt.suprafata || ''},${apt.nrCamere || ''},${apt.cotaIndiviza || ''},${apt.nrPersoane},"${apt.scara?.numar || ''}","${prop?.user?.name || ''}","${prop?.user?.email || ''}"\n`
    }
    csv += '\n'
  }

  if (data.sumar) {
    csv += '## Sumar\n'
    csv += `Total Încasări,${data.sumar.totalIncasari}\n`
    csv += `Total Restanțe,${data.sumar.totalRestante}\n`
    csv += `Număr Apartamente,${data.sumar.numarApartamente}\n`
    csv += `Număr Chitanțe,${data.sumar.numarChitante}\n`
  }

  return csv
}
