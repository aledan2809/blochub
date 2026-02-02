import { NextRequest, NextResponse } from 'next/server'

// ANAF API pentru verificare date firmă
// Documentație: https://www.anaf.ro/anaf/internet/ANAF/servicii_online/servicii_oferite_persoane_juridice/

interface BilantIndicator {
  indicator: string
  val_indicator: number | null
  val_den_indicator: string
}

interface BilantResponse {
  an: number
  cui: number
  dpiP: string  // data_inregistrare
  caen: number
  caen_denumire: string
  i: BilantIndicator[]
}

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
  notFound: number[]
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

    // Apel API ANAF v9 (endpoint actualizat 2025)
    const anafResponse = await fetch('https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva', {
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
    if (data.notFound && data.notFound.includes(parseInt(cuiClean))) {
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

    // Obține datele de bilanț pentru ultimii 5 ani
    let bilantData = null
    const istoricBilant: Array<{
      an: number
      cifraAfaceri: number
      profitNet: number
      datorii: number
      activeImobilizate: number
      activeCirculante: number
      capitaluriProprii: number
      nrSalariati: number
    }> = []

    try {
      const currentYear = new Date().getFullYear()
      // Fetch în paralel pentru ultimii 5 ani (mai rapid)
      const years = [currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5]

      const bilantPromises = years.map(an =>
        fetch(`https://webservicesp.anaf.ro/bilant?an=${an}&cui=${cuiClean}`, { method: 'GET' })
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      )

      const bilantResults = await Promise.all(bilantPromises)

      for (let i = 0; i < bilantResults.length; i++) {
        const bilant: BilantResponse | null = bilantResults[i]
        if (bilant && bilant.i && bilant.i.length > 0) {
          // Mapăm indicatorii la un format mai ușor de folosit
          const indicators: Record<string, number | null> = {}
          bilant.i.forEach((ind: BilantIndicator) => {
            indicators[ind.indicator] = ind.val_indicator
          })

          const yearData = {
            an: bilant.an || years[i],
            caen: bilant.caen,
            caenDenumire: bilant.caen_denumire,
            activeImobilizate: indicators['I'] || 0,
            activeCirculante: indicators['II'] || 0,
            stocuri: indicators['II.1'] || 0,
            creante: indicators['II.2'] || 0,
            casaBanca: indicators['II.3'] || 0,
            datorii: indicators['III'] || 0,
            capitaluriProprii: indicators['IV'] || 0,
            capitalSocial: indicators['IV.1'] || 0,
            cifraAfaceriNeta: indicators['I1'] || 0,
            venituriTotale: indicators['21'] || 0,
            cheltuieliTotale: indicators['22'] || 0,
            profitBrut: indicators['23'] || 0,
            profitNet: indicators['26'] || 0,
            nrMediuSalariati: indicators['27'] || 0,
          }

          // Primul an valid devine bilantData (cel mai recent)
          if (!bilantData) {
            bilantData = yearData
          }

          // Adaugă la istoric
          istoricBilant.push({
            an: yearData.an,
            cifraAfaceri: yearData.cifraAfaceriNeta,
            profitNet: yearData.profitNet,
            datorii: yearData.datorii,
            activeImobilizate: yearData.activeImobilizate,
            activeCirculante: yearData.activeCirculante,
            capitaluriProprii: yearData.capitaluriProprii,
            nrSalariati: yearData.nrMediuSalariati,
          })
        }
      }

      // Sortează istoricul descrescător după an
      istoricBilant.sort((a, b) => b.an - a.an)

    } catch (bilantError) {
      console.error('Error fetching bilant:', bilantError)
      // Nu oprește execuția - continuăm fără date de bilanț
    }

    // Date TVA la încasare
    const tvaIncasare = firma.inregistrare_RTVAI
    const splitTVA = firma.inregistrare_SplitTVA

    // Calculăm riscurile
    const riscuri: string[] = []
    const avertismente: string[] = []

    // Riscuri majore (roșu)
    if (stareInactiv?.statusInactivi) {
      riscuri.push('Contribuabil declarat INACTIV de ANAF')
    }
    if (stareInactiv?.dataRadiere) {
      riscuri.push('Firmă RADIATĂ din Registrul Comerțului')
    }

    // Avertismente (galben)
    if (bilantData) {
      if (bilantData.nrMediuSalariati === 0) {
        avertismente.push('Fără angajați declarați')
      }
      if (bilantData.capitalSocial && bilantData.capitalSocial <= 200) {
        avertismente.push('Capital social minim')
      }
      if (bilantData.profitNet && bilantData.profitNet < 0) {
        avertismente.push('Profit negativ în ultimul an')
      }
      if (bilantData.capitaluriProprii && bilantData.capitaluriProprii < 0) {
        avertismente.push('Capitaluri proprii negative')
      }
      if (bilantData.datorii && bilantData.capitaluriProprii &&
          bilantData.datorii > bilantData.capitaluriProprii * 3) {
        avertismente.push('Datorii ridicate vs capitaluri proprii')
      }
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
        organFiscal: dateGenerale.organFiscalCompetent || null,
        formaJuridica: dateGenerale.forma_juridica || null,
        formaProprietate: dateGenerale.forma_de_proprietate || null,
        // Status TVA
        platitorTVA: inregistrareTVA?.scpTVA || false,
        perioadeVAT: inregistrareTVA?.perioade_TVA || [],
        // TVA la încasare
        tvaIncasare: tvaIncasare?.statusTvaIncasare || false,
        dataInceputTvaInc: tvaIncasare?.dataInceputTvaInc || null,
        // Split TVA
        splitTVA: splitTVA?.statusSplitTVA || false,
        dataInceputSplitTVA: splitTVA?.dataInceputSplitTVA || null,
        // Status inactiv
        esteInactiv: stareInactiv?.statusInactivi || false,
        dataInactivare: stareInactiv?.dataInactivare || null,
        dataReactivare: stareInactiv?.dataReactivare || null,
        dataRadiere: stareInactiv?.dataRadiere || null,
        // e-Factura
        eFactura: dateGenerale.statusRO_e_Factura || false,
        // IBAN (dacă e disponibil în baza ANAF)
        iban: dateGenerale.iban || null,
      },
      bilant: bilantData,
      istoricBilant,
      riscuri,
      avertismente,
    })
  } catch (error) {
    console.error('Verificare ANAF error:', error)
    return NextResponse.json(
      { error: 'Eroare la verificarea datelor. Încercați din nou.' },
      { status: 500 }
    )
  }
}
