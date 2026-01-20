import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create admin user
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@blochub.ro' },
    update: {},
    create: {
      email: 'admin@blochub.ro',
      name: 'Administrator BlocHub',
      password: adminPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // Create a tenant user
  const tenantPassword = await hash('tenant123', 12)
  const tenant = await prisma.user.upsert({
    where: { email: 'proprietar@email.com' },
    update: {},
    create: {
      email: 'proprietar@email.com',
      name: 'Ion Popescu',
      phone: '0721234567',
      password: tenantPassword,
      role: 'PROPRIETAR',
      emailVerified: new Date(),
    },
  })
  console.log('✅ Tenant user created:', tenant.email)

  // Create association
  const asociatie = await prisma.asociatie.upsert({
    where: { cui: 'RO12345678' },
    update: {},
    create: {
      nume: 'Asociația de Proprietari Bloc A1',
      cui: 'RO12345678',
      adresa: 'Str. Exemplu nr. 10',
      oras: 'București',
      judet: 'București',
      codPostal: '010101',
      email: 'asociatie@blocA1.ro',
      telefon: '0211234567',
      contBancar: 'RO49AAAA1B31007593840000',
      banca: 'Banca Transilvania',
      ziScadenta: 25,
      penalizareZi: 0.02,
      adminId: admin.id,
    },
  })
  console.log('✅ Association created:', asociatie.nume)

  // Create stairs
  const scara = await prisma.scara.upsert({
    where: {
      asociatieId_numar: {
        asociatieId: asociatie.id,
        numar: 'A',
      },
    },
    update: {},
    create: {
      numar: 'A',
      etaje: 10,
      asociatieId: asociatie.id,
    },
  })
  console.log('✅ Stair created:', scara.numar)

  // Create apartments
  const apartments = []
  for (let i = 1; i <= 20; i++) {
    const apt = await prisma.apartament.upsert({
      where: {
        asociatieId_numar: {
          asociatieId: asociatie.id,
          numar: i.toString(),
        },
      },
      update: {},
      create: {
        numar: i.toString(),
        etaj: Math.ceil(i / 2),
        suprafata: 50 + Math.random() * 50,
        nrCamere: 2 + Math.floor(Math.random() * 2),
        cotaIndiviza: 5,
        nrPersoane: 1 + Math.floor(Math.random() * 4),
        asociatieId: asociatie.id,
        scaraId: scara.id,
      },
    })
    apartments.push(apt)
  }
  console.log(`✅ Created ${apartments.length} apartments`)

  // Link tenant to apartment 1
  await prisma.proprietarApartament.upsert({
    where: {
      userId_apartamentId: {
        userId: tenant.id,
        apartamentId: apartments[0].id,
      },
    },
    update: {},
    create: {
      userId: tenant.id,
      apartamentId: apartments[0].id,
      cotaParte: 100,
      esteActiv: true,
    },
  })
  console.log('✅ Tenant linked to apartment 1')

  // Create funds
  const fondRulment = await prisma.fond.create({
    data: {
      tip: 'RULMENT',
      denumire: 'Fond de rulment',
      sumaLunara: 50,
      soldCurent: 5000,
      asociatieId: asociatie.id,
    },
  })

  const fondReparatii = await prisma.fond.create({
    data: {
      tip: 'REPARATII',
      denumire: 'Fond de reparații',
      sumaLunara: 100,
      soldCurent: 15000,
      asociatieId: asociatie.id,
    },
  })
  console.log('✅ Funds created')

  // Create supplier
  const furnizor = await prisma.furnizor.create({
    data: {
      nume: 'Apa Nova București',
      cui: 'RO11111111',
      email: 'facturare@apanova.ro',
      telefon: '0212222222',
      asociatieId: asociatie.id,
    },
  })
  console.log('✅ Supplier created:', furnizor.nume)

  // Create expenses for current month
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const cheltuieli = await Promise.all([
    prisma.cheltuiala.create({
      data: {
        tip: 'APA_RECE',
        descriere: 'Apă rece luna curentă',
        suma: 2500,
        dataFactura: new Date(),
        nrFactura: `F${currentYear}${currentMonth}001`,
        modRepartizare: 'PERSOANE',
        luna: currentMonth,
        an: currentYear,
        asociatieId: asociatie.id,
        furnizorId: furnizor.id,
      },
    }),
    prisma.cheltuiala.create({
      data: {
        tip: 'CURENT_COMUN',
        descriere: 'Curent electric părți comune',
        suma: 800,
        dataFactura: new Date(),
        nrFactura: `E${currentYear}${currentMonth}001`,
        modRepartizare: 'APARTAMENT',
        luna: currentMonth,
        an: currentYear,
        asociatieId: asociatie.id,
      },
    }),
    prisma.cheltuiala.create({
      data: {
        tip: 'CURATENIE',
        descriere: 'Servicii curățenie',
        suma: 600,
        dataFactura: new Date(),
        modRepartizare: 'APARTAMENT',
        luna: currentMonth,
        an: currentYear,
        asociatieId: asociatie.id,
      },
    }),
    prisma.cheltuiala.create({
      data: {
        tip: 'ASCENSOR',
        descriere: 'Întreținere lift',
        suma: 400,
        dataFactura: new Date(),
        modRepartizare: 'APARTAMENT',
        luna: currentMonth,
        an: currentYear,
        asociatieId: asociatie.id,
      },
    }),
  ])
  console.log(`✅ Created ${cheltuieli.length} expenses`)

  // Create meters for apartment 1
  const contor = await prisma.contor.create({
    data: {
      serie: 'APA-001',
      tip: 'APA_RECE',
      dataInstalare: new Date('2023-01-01'),
      esteActiv: true,
      apartamentId: apartments[0].id,
    },
  })

  await prisma.indexContor.create({
    data: {
      valoare: 125.5,
      dataIndex: new Date(),
      luna: currentMonth,
      an: currentYear,
      contorId: contor.id,
      apartamentId: apartments[0].id,
    },
  })
  console.log('✅ Meter and index created for apartment 1')

  // Create a chitanta for apartment 1
  const chitanta = await prisma.chitanta.create({
    data: {
      numar: 1,
      luna: currentMonth,
      an: currentYear,
      sumaIntretinere: 215,
      sumaRestanta: 0,
      sumaPenalizare: 0,
      sumaFonduri: 150,
      sumaTotal: 365,
      dataScadenta: new Date(currentYear, currentMonth - 1, 25),
      status: 'GENERATA',
      asociatieId: asociatie.id,
      apartamentId: apartments[0].id,
      detaliiJson: JSON.stringify({
        apaRece: 125,
        curentComun: 40,
        curatenie: 30,
        ascensor: 20,
        fondRulment: 50,
        fondReparatii: 100,
      }),
    },
  })
  console.log('✅ Chitanta created for apartment 1')

  // Create notification for tenant
  await prisma.notificare.create({
    data: {
      tip: 'CHITANTA_NOUA',
      titlu: 'Chitanță nouă disponibilă',
      mesaj: `Chitanța pentru luna ${currentMonth}/${currentYear} este disponibilă. Suma de plată: 365.00 RON`,
      userId: tenant.id,
    },
  })
  console.log('✅ Notification created')

  // Create an announcement
  await prisma.anunt.create({
    data: {
      titlu: 'Bine ați venit pe BlocHub!',
      continut: 'Aceasta este noua platformă de administrare a asociației. Puteți vizualiza chitanțele, face plăți online și comunica direct cu administratorul.',
      important: true,
      asociatieId: asociatie.id,
    },
  })
  console.log('✅ Announcement created')

  console.log('')
  console.log('🎉 Seed completed successfully!')
  console.log('')
  console.log('📧 Test accounts:')
  console.log('   Admin: admin@blochub.ro / admin123')
  console.log('   Tenant: proprietar@email.com / tenant123')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
