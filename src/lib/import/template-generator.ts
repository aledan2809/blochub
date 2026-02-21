import * as XLSX from 'xlsx'

// Generate standard BlocHub import template
export function generateStandardTemplate(): Buffer {
  const headers = [
    'Numar',
    'Tip Unitate',
    'Scara',
    'Etaj',
    'Suprafata (mp)',
    'Nr Camere',
    'Nr Persoane',
    'Cota Indiviza (%)',
    'Nr Cadastral',
    'Proprietar Nume',
    'Email',
    'Telefon',
    'Serie Contor Apa Rece',
    'Index Apa Rece',
    'Serie Contor Apa Calda',
    'Index Apa Calda',
  ]

  const exampleRow = [
    '1',
    'APARTAMENT',
    'A',
    '2',
    '52.5',
    '2',
    '3',
    '2.35',
    '12345',
    'Popescu Ion',
    'ion@email.com',
    '+40721000000',
    'AR-001',
    '125.5',
    'AC-001',
    '89.2',
  ]

  const tipuriUnitate = ['APARTAMENT', 'PARCARE', 'BOXA', 'SPATIU_COMERCIAL']

  // Main sheet with headers + example
  const wsData = [headers, exampleRow]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Set column widths
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }))

  // Instructions sheet
  const instrData = [
    ['Instrucțiuni Import BlocHub'],
    [''],
    ['Câmpuri obligatorii: Numar'],
    ['Câmpuri recomandate: Suprafata, Cota Indiviza, Nr Persoane, Proprietar Nume'],
    [''],
    ['Tip Unitate — valori posibile:'],
    ...tipuriUnitate.map((t) => [`  - ${t}`]),
    [''],
    ['Format numere: folosiți punct (.) sau virgulă (,) ca separator zecimal'],
    ['Format telefon: +40721000000 (cu prefix țară)'],
    [''],
    ['Nr Persoane: dacă lipsește, se completează automat cu 1'],
    ['Cota Indiviză: procentul din total trebuie să fie ~100% pentru toate unitățile'],
    [''],
    ['Contoare: puteți adăuga serie + index actual pentru apă rece și apă caldă'],
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData)
  wsInstr['!cols'] = [{ wch: 70 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Unitati')
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructiuni')

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

// Generate BlocManager-compatible template
export function generateBlocManagerTemplate(): Buffer {
  const headers = [
    'Nr. ap.',
    'Numele şi prenumele',
    'Nr. pers.',
    'Cota parte',
    'Supr. utilă',
  ]

  const exampleRow = ['1', 'Popescu Ion', '3', '2.35', '52.5']

  const wsData = [headers, exampleRow]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Lista')

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
