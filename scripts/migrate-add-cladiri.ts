// Script de migrare pentru a adăuga clădiri la asociațiile existente
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🔄 Începe migrarea pentru adăugarea clădirilor...\n')

  try {
    // 1. Găsește toate asociațiile existente
    const asociatii = await db.asociatie.findMany({
      include: {
        scari: true,
      },
    })

    console.log(`✓ Găsite ${asociatii.length} asociații\n`)

    for (const asociatie of asociatii) {
      console.log(`📍 Procesez asociația: ${asociatie.nume}`)

      // 2. Verifică dacă asociația are deja o clădire
      const cladireExistenta = await db.cladire.findFirst({
        where: { asociatieId: asociatie.id },
      })

      let cladire = cladireExistenta

      if (!cladireExistenta) {
        // 3. Creează clădirea pentru asociație
        cladire = await db.cladire.create({
          data: {
            nume: 'Clădirea Principală',
            asociatieId: asociatie.id,
          },
        })
        console.log(`  ✓ Clădire creată: ${cladire.id}`)
      } else {
        console.log(`  ℹ Clădire existentă: ${cladireExistenta.id}`)
      }

      // 4. Actualizează scările să pointeze la clădire
      if (asociatie.scari.length > 0 && cladire) {
        // Actualizează toate scările asociației să pointeze la clădirea corectă
        let updateCount = 0
        for (const s of asociatie.scari) {
          // Actualizează doar dacă nu are deja cladireId corect
          if (!s.cladireId || s.cladireId !== cladire.id) {
            await db.scara.update({
              where: { id: s.id },
              data: { cladireId: cladire.id },
            })
            updateCount++
          }
        }

        console.log(`  ✓ Actualizate ${updateCount} scări\n`)
      } else {
        console.log(`  ℹ Nicio scară de actualizat\n`)
      }
    }

    console.log('✅ Migrare completată cu succes!')
  } catch (error) {
    console.error('❌ Eroare în timpul migrării:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
