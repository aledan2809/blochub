import { db } from './db'

/**
 * Tenant-ownership guards (IDOR protection) for admin-facing routes.
 *
 * Ownership model (house pattern): a user "owns" an asociație iff they are its
 * `adminId`. Route handlers must scope every tenant resource through one of these
 * helpers instead of querying by client-supplied id alone — otherwise an
 * authenticated user can read/write another association's data (cross-tenant IDOR).
 *
 * Use `findOwnedApartament` when you need the apartment fields; `ownsAsociatie`
 * when you only need a boolean gate. Both return null/false on no-access — the
 * caller should respond 404 (do not leak existence).
 */

/** Returns the apartment (id/numar/asociatieId) iff it belongs to an association the user administers, else null. */
export async function findOwnedApartament(apartamentId: string, userId: string) {
  return db.apartament.findFirst({
    where: { id: apartamentId, asociatie: { adminId: userId } },
    select: { id: true, numar: true, asociatieId: true },
  })
}

/** True iff the user administers the given association. */
export async function ownsAsociatie(asociatieId: string, userId: string): Promise<boolean> {
  const a = await db.asociatie.findFirst({
    where: { id: asociatieId, adminId: userId },
    select: { id: true },
  })
  return !!a
}
