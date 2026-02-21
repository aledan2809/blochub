import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // ============================================
  // PLATFORM SETTINGS (Singleton)
  // ============================================
  const platformSettings = await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      // Trial & Grace Period
      trialDays: 14,
      graceDays: 7,
      trialWarningDays: [7, 3, 1],
      paymentWarningDays: [7, 3, 1],

      // Feature toggles
      aiEnabled: true,
      spvEnabled: true,
      stripeEnabled: true,

      // Platform branding
      platformName: 'BlocHub',
      primaryColor: '#2563eb',
      supportEmail: 'support@blochub.ro',

      // Revolut Payment Gateway (disabled by default - configure in Super Admin)
      revolutEnabled: false,
      revolutEnvironment: 'sandbox',
      // revolutApiKey, revolutWebhookSecret - to be configured in Super Admin

      // Company billing details (to be configured in Super Admin)
      companyName: 'BlocHub SRL',
      companyCountry: 'România',
      companyIsVatPayer: true,
      vatRate: 0.19,
      // companyCui, companyRegCom, companyAddress, etc. - to be configured
    },
  })
  console.log('✅ Platform settings created')

  // ============================================
  // FUNCTIONAL MODULES
  // ============================================
  const moduleBaza = await prisma.modulFunctional.upsert({
    where: { cod: 'BAZA' },
    update: {},
    create: {
      cod: 'BAZA',
      nume: 'Bază (Core)',
      descriere: 'Funcționalități de bază: dashboard, apartamente, proprietari, chitanțe, avizier',
      featuresJson: JSON.stringify([
        'dashboard',
        'apartamente.crud',
        'proprietari.crud',
        'chitante.view',
        'chitante.generate',
        'avizier.basic',
      ]),
    },
  })

  const moduleFinanciar = await prisma.modulFunctional.upsert({
    where: { cod: 'FINANCIAR' },
    update: {},
    create: {
      cod: 'FINANCIAR',
      nume: 'Financiar',
      descriere: 'Gestiune financiară: încasări, cheltuieli, fonduri, rapoarte, export',
      featuresJson: JSON.stringify([
        'incasari',
        'cheltuieli',
        'fonduri',
        'rapoarte',
        'export.excel',
        'export.pdf',
        'penalizari.auto',
      ]),
    },
  })

  const moduleAutomatizari = await prisma.modulFunctional.upsert({
    where: { cod: 'AUTOMATIZARI' },
    update: {},
    create: {
      cod: 'AUTOMATIZARI',
      nume: 'Automatizări',
      descriere: 'Funcționalități AI: OCR facturi, OCR indexuri, predicții, remindere, chatbot',
      featuresJson: JSON.stringify([
        'ocr.facturi',
        'ocr.indexuri',
        'predictii.ai',
        'remindere.auto',
        'raport.saptamanal',
        'chatbot.ai',
      ]),
    },
  })

  const moduleIntegrari = await prisma.modulFunctional.upsert({
    where: { cod: 'INTEGRARI' },
    update: {},
    create: {
      cod: 'INTEGRARI',
      nume: 'Integrări',
      descriere: 'Integrări externe: SPV/e-Factura, SMTP custom, API, webhooks, white-label',
      featuresJson: JSON.stringify([
        'spv.efactura',
        'smtp.custom',
        'api.access',
        'webhooks',
        'white.label',
      ]),
    },
  })
  console.log('✅ Functional modules created')

  // ============================================
  // PRICING PLANS
  // ============================================
  const planFree = await prisma.plan.upsert({
    where: { cod: 'FREE' },
    update: {},
    create: {
      cod: 'FREE',
      nume: 'Plan Gratuit',
      descriere: 'Perfect pentru asociații mici care doresc să înceapă',
      pretPerApartament: 0,
      pretMinimLunar: 0,
      limiteJson: JSON.stringify({
        asociatii: 1,
        apartamente: 30,
        utilizatori: 1,
        storageMB: 100,
        aiRequests: 0,
        emailsPerMonth: 100,
        istoricAni: 1,
      }),
      esteActiv: true,
      estePublic: true,
      ordine: 1,
      moduleIncluse: {
        connect: [{ cod: 'BAZA' }],
      },
    },
  })

  const planStarter = await prisma.plan.upsert({
    where: { cod: 'STARTER' },
    update: {},
    create: {
      cod: 'STARTER',
      nume: 'Starter',
      descriere: 'Pentru administratori cu câteva asociații',
      pretPerApartament: 1.5,
      pretMinimLunar: 50,
      limiteJson: JSON.stringify({
        asociatii: 3,
        apartamente: 200,
        utilizatori: 5,
        storageMB: 1024,
        aiRequests: 0,
        emailsPerMonth: 1000,
        istoricAni: 3,
      }),
      esteActiv: true,
      estePublic: true,
      ordine: 2,
      moduleIncluse: {
        connect: [{ cod: 'BAZA' }, { cod: 'FINANCIAR' }],
      },
    },
  })

  const planPro = await prisma.plan.upsert({
    where: { cod: 'PRO' },
    update: {},
    create: {
      cod: 'PRO',
      nume: 'Professional',
      descriere: 'Pentru firme de administrare profesionale',
      pretPerApartament: 2.5,
      pretMinimLunar: 150,
      limiteJson: JSON.stringify({
        asociatii: 10,
        apartamente: 1000,
        utilizatori: 20,
        storageMB: 10240,
        aiRequests: 500,
        emailsPerMonth: 10000,
        istoricAni: 7,
      }),
      esteActiv: true,
      estePublic: true,
      ordine: 3,
      moduleIncluse: {
        connect: [{ cod: 'BAZA' }, { cod: 'FINANCIAR' }, { cod: 'AUTOMATIZARI' }],
      },
    },
  })

  const planEnterprise = await prisma.plan.upsert({
    where: { cod: 'ENTERPRISE' },
    update: {},
    create: {
      cod: 'ENTERPRISE',
      nume: 'Enterprise',
      descriere: 'Pentru companii mari cu nevoi complexe',
      pretPerApartament: 3.5,
      pretMinimLunar: 500,
      limiteJson: JSON.stringify({
        asociatii: -1, // unlimited
        apartamente: -1,
        utilizatori: -1,
        storageMB: 102400,
        aiRequests: -1,
        emailsPerMonth: -1,
        istoricAni: -1,
      }),
      esteActiv: true,
      estePublic: true,
      ordine: 4,
      moduleIncluse: {
        connect: [
          { cod: 'BAZA' },
          { cod: 'FINANCIAR' },
          { cod: 'AUTOMATIZARI' },
          { cod: 'INTEGRARI' },
        ],
      },
    },
  })
  console.log('✅ Pricing plans created')

  // ============================================
  // SUPER ADMIN USER
  // ============================================
  const superAdminPassword = await hash('superadmin123', 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@blochub.ro' },
    update: {},
    create: {
      email: 'superadmin@blochub.ro',
      name: 'Super Administrator',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      emailVerified: new Date(),
    },
  })
  console.log('✅ Super Admin created:', superAdmin.email)

  // ============================================
  // DEMO ORGANIZATION
  // ============================================
  const organizatie = await prisma.organizatie.upsert({
    where: { cui: 'RO99999999' },
    update: {},
    create: {
      nume: 'Demo Admin Imobil SRL',
      cui: 'RO99999999',
      adresa: 'Str. Demo nr. 1',
      email: 'contact@demo-admin.ro',
      telefon: '0211234567',
      status: 'ACTIVA',
    },
  })
  console.log('✅ Demo organization created:', organizatie.nume)

  // Create subscription for demo organization (FREE plan)
  await prisma.abonament.upsert({
    where: { organizatieId: organizatie.id },
    update: {},
    create: {
      organizatieId: organizatie.id,
      planId: planFree.id,
      status: 'ACTIV',
      dataStart: new Date(),
    },
  })
  console.log('✅ Subscription created for demo organization')

  // Create admin user (organization admin)
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@blochub.ro' },
    update: {},
    create: {
      email: 'admin@blochub.ro',
      name: 'Administrator Demo',
      password: adminPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // Link admin to organization as OWNER
  await prisma.utilizatorOrganizatie.upsert({
    where: {
      userId_organizatieId: {
        userId: admin.id,
        organizatieId: organizatie.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      organizatieId: organizatie.id,
      rol: 'OWNER',
      esteActiv: true,
      acceptedAt: new Date(),
    },
  })
  console.log('✅ Admin linked to organization as OWNER')

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

  // Create association (linked to organization)
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
      organizatieId: organizatie.id, // Link to organization
    },
  })
  console.log('✅ Association created:', asociatie.nume)

  // Create building
  const cladire = await prisma.cladire.upsert({
    where: { id: 'seed-cladire-1' },
    update: {},
    create: {
      id: 'seed-cladire-1',
      nume: 'Clădirea Principală',
      asociatieId: asociatie.id,
    },
  })
  console.log('✅ Building created:', cladire.nume)

  // Create stairs
  const scara = await prisma.scara.upsert({
    where: {
      cladireId_numar: {
        cladireId: cladire.id,
        numar: 'A',
      },
    },
    update: {},
    create: {
      numar: 'A',
      etaje: 10,
      cladireId: cladire.id,
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
  console.log('   Super Admin: superadmin@blochub.ro / superadmin123')
  console.log('   Org Admin:   admin@blochub.ro / admin123')
  console.log('   Tenant:      proprietar@email.com / tenant123')
  console.log('')
  console.log('🏢 Demo organization: Demo Admin Imobil SRL')
  console.log('   Plan: FREE (Gratuit)')
  console.log('   Association: Asociația de Proprietari Bloc A1')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
