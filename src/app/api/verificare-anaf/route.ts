import { NextRequest, NextResponse } from 'next/server'

// ANAF API pentru verificare date firmă
// Documentație: https://www.anaf.ro/anaf/internet/ANAF/servicii_online/servicii_oferite_persoane_juridice/

interface ANAFResponse {
  cod: number
  message: string
  found: Array<{
    date_generale: {
      cui: number
      data: string
      denumire: string
      adresa: string
      nrRegCom: string
      telefon: string
      fax: string
      codPostal: string
      act: string
      stare_inregistrare: string
      data_inregistrare: string
      cod_CAEN: string
      iban: string
      statusRO_e_Factura: boolean
      organFiscalCompetent: string
      forma_de_proprietate: string
      forma_organizare: string
      forma_juridica: string
    }
    inregistrare_scop_Tva: {
      scpTVA: boolean
      perioade_TVA: Array<{
        data_inceput_ScpTVA: string
        data_sfarsit_ScpTVA: string
        data_anul_imp_ScpTVA: string
        mesaj_ScpTVA: string
      }>
    }
    inregistrare_RTVAI: {
      dataInceputTvaInc: string
      dataSfarsitTvaInc: string
      dataActualizareTvaInc: string
      dataPublicareTvaInc: string
      tipActTvaInc: string
      statusTvaIncasare: boolean
    }
    stare_inactiv: {
      dataInactivare: string
      dataReactivare: string
      dataPublicare: string
      dataRadiere: string
      statusInactivi: boolean
    }
    inregistrare_SplitTVA: {
      dataInceputSplitTVA: string
      dataAnulareSplitTVA: string
      statusSplitTVA: boolean
    }
    adresa_sediu_social: {
      sdenumire_Strada: string
      snumar_Strada: string
      sdenumire_Localitate: string
      scod_Localitate: string
      sdenumire_Judet: string
      scod_Judet: string
      scod_JudetAuto: string
      stara: string
      sdetalii_Adresa: string
      scod_Postal: string
    }
    adresa_domiciliu_fiscal: {
      ddenumire_Strada: string
      dnumar_Strada: string
      ddenumire_Localitate: string
      dcod_Localitate: string
      ddenumire_Judet: string
      dcod_Judet: string
      dcod_JudetAuto: string
      dtara: string
      ddetalii_Adresa: string
      dcod_Postal: string
    }
  }>
  notfound: number[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cui } = body

    if (!cui) {
      return NextResponse.json({ error: 'CUI este obligatoriu' }, { status: 400 })
    }

    // Curăță CUI-ul de caractere non-numerice (ex: RO12345678 -> 12345678)
    const cuiClean = cui.toString().replace(/\D/g, '')

    if (!cuiClean || cuiClean.length < 2 || cuiClean.length > 10) {
      return NextResponse.json({ error: 'CUI invalid' }, { status: 400 })
    }

    // Format dată pentru ANAF (YYYY-MM-DD)
    const today = new Date().toISOString().slice(0, 10)

    // Apel API ANAF
    const anafResponse = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          cui: parseInt(cuiClean),
          data: today
        }
      ])
    })

    if (!anafResponse.ok) {
      console.error('ANAF API error:', anafResponse.status, anafResponse.statusText)
      return NextResponse.json(
        { error: 'Eroare la comunicarea cu ANAF. Încercați din nou.' },
        { status: 502 }
      )
    }

    const data: ANAFResponse = await anafResponse.json()

    // Verifică dacă firma a fost găsită
    if (data.notfound && data.notfound.includes(parseInt(cuiClean))) {
      return NextResponse.json({
        found: false,
        message: 'Firma nu a fost găsită în baza de date ANAF'
      })
    }

    if (!data.found || data.found.length === 0) {
      return NextResponse.json({
        found: false,
        message: 'Nu s-au găsit date pentru acest CUI'
      })
    }

    const firma = data.found[0]
    const dateGenerale = firma.date_generale
    const adresaSediu = firma.adresa_sediu_social
    const inregistrareTVA = firma.inregistrare_scop_Tva
    const stareInactiv = firma.stare_inactiv

    // Construiește adresa completă
    let adresaCompleta = ''
    if (adresaSediu) {
      const parts = [
        adresaSediu.sdenumire_Strada,
        adresaSediu.snumar_Strada ? `Nr. ${adresaSediu.snumar_Strada}` : '',
        adresaSediu.sdenumire_Localitate,
        adresaSediu.sdenumire_Judet
      ].filter(Boolean)
      adresaCompleta = parts.join(', ')
    } else if (dateGenerale.adresa) {
      adresaCompleta = dateGenerale.adresa
    }

    // Returnează datele într-un format simplificat
    return NextResponse.json({
      found: true,
      firma: {
        cui: dateGenerale.cui,
        denumire: dateGenerale.denumire,
        adresa: adresaCompleta,
        codPostal: adresaSediu?.scod_Postal || dateGenerale.codPostal,
        judet: adresaSediu?.sdenumire_Judet || '',
        localitate: adresaSediu?.sdenumire_Localitate || '',
        telefon: dateGenerale.telefon || null,
        nrRegCom: dateGenerale.nrRegCom || null,
        codCAEN: dateGenerale.cod_CAEN || null,
        stareInregistrare: dateGenerale.stare_inregistrare,
        dataInregistrare: dateGenerale.data_inregistrare,
        // Status TVA
        platitorTVA: inregistrareTVA?.scpTVA || false,
        // Status inactiv
        esteInactiv: stareInactiv?.statusInactivi || false,
        dataInactivare: stareInactiv?.dataInactivare || null,
        // e-Factura
        eFactura: dateGenerale.statusRO_e_Factura || false,
        // IBAN (dacă e disponibil în baza ANAF)
        iban: dateGenerale.iban || null,
      }
    })
  } catch (error) {
    console.error('Verificare ANAF error:', error)
    return NextResponse.json(
      { error: 'Eroare la verificarea datelor. Încercați din nou.' },
      { status: 500 }
    )
  }
}
