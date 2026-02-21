import { db } from './db'

// Actions that require a mandatory explanatory note
const MANDATORY_NOTE_ACTIONS = [
  'RESET_CONTOR',
  'SCHIMBARE_FURNIZOR',
  'STERGERE_APARTAMENT',
  'MODIFICARE_COTA_INDIVIZA',
  'STERGERE_PROPRIETAR',
  'IMPORT_APARTAMENTE',
] as const

export function requiresNote(actiune: string): boolean {
  return MANDATORY_NOTE_ACTIONS.includes(actiune as any)
}

interface AuditLogInput {
  userId?: string
  userName?: string
  actiune: string
  entitate: string
  entitatId?: string
  valoriVechi?: Record<string, any> | null
  valoriNoi?: Record<string, any> | null
  notaExplicativa?: string
  asociatieId?: string
  ipAddress?: string
}

export async function logAudit(input: AuditLogInput) {
  if (requiresNote(input.actiune) && !input.notaExplicativa) {
    throw new Error(`Nota explicativă este obligatorie pentru acțiunea: ${input.actiune}`)
  }

  return db.auditLog.create({
    data: {
      userId: input.userId,
      userName: input.userName,
      actiune: input.actiune,
      entitate: input.entitate,
      entitatId: input.entitatId,
      valoriVechi: input.valoriVechi ? JSON.stringify(input.valoriVechi) : null,
      valoriNoi: input.valoriNoi ? JSON.stringify(input.valoriNoi) : null,
      notaExplicativa: input.notaExplicativa,
      asociatieId: input.asociatieId,
      ipAddress: input.ipAddress,
    },
  })
}
