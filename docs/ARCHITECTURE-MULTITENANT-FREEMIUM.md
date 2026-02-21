# BlocHub - Arhitectură Multi-Tenant + Freemium

## 1. Structura Entităților

```
┌─────────────────────────────────────────────────────────────┐
│                      SUPER_ADMIN                             │
│              (Platform Owner - Blochub Team)                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     ORGANIZATIE                              │
│        (Firmă administrare imobile / Administrator)          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  ABONAMENT   │  │  UTILIZATORI │  │   ASOCIATII  │       │
│  │  (Plan +     │  │  (cu roluri  │  │   (puncte    │       │
│  │   Module)    │  │   per org)   │  │   de lucru)  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      ASOCIATIE                               │
│            (Asociație de proprietari - HOA)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  APARTAMENTE │  │  CHELTUIELI  │  │   CHITANTE   │       │
│  │  PROPRIETARI │  │   FONDURI    │  │    PLATI     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Module Funcționale

### Modul 1: BAZĂ (Core) - Gratuit
- Dashboard cu statistici de bază
- Gestiune apartamente (CRUD)
- Gestiune proprietari/chiriași
- Chitanțe manuale (generare, vizualizare)
- Avizier simplu
- 1 utilizator admin

### Modul 2: FINANCIAR (Finance) - Starter
- Tot din Modul Bază +
- Încasări (înregistrare plăți)
- Cheltuieli (facturi furnizori)
- Fonduri (rulment, reparații)
- Rapoarte financiare
- Export Excel/PDF
- Penalizări automate

### Modul 3: AUTOMATIZĂRI (Automation) - Professional
- Tot din Modul Financiar +
- OCR facturi (AI)
- OCR indexuri contoare (AI)
- Predicții restanțe (AI)
- Remindere automate email
- Raport săptămânal automat
- Chatbot AI pentru proprietari

### Modul 4: INTEGRĂRI (Integrations) - Enterprise
- Tot din Modul Automatizări +
- Integrare SPV/e-Factura ANAF
- SMTP custom pentru email
- API access pentru integrări
- Webhook-uri pentru evenimente
- White-label (brand propriu)
- Suport prioritar

---

## 3. Planuri de Preț

### Model: Per Apartament / Lună

| Plan | Preț/apt/lună | Module incluse | Limite |
|------|---------------|----------------|--------|
| **Free** | 0 lei | Bază | 1 asociație, max 30 apt |
| **Starter** | 1.5 lei | Bază + Financiar | 3 asociații, max 200 apt total |
| **Pro** | 2.5 lei | Toate except Integrări | 10 asociații, max 1000 apt |
| **Enterprise** | 3.5 lei | Toate modulele | Nelimitat |

### Limite Suplimentare

| Resursă | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| Utilizatori org | 1 | 5 | 20 | Nelimitat |
| Stocare documente | 100 MB | 1 GB | 10 GB | 100 GB |
| AI requests/lună | 0 | 0 | 500 | Nelimitat |
| Email-uri/lună | 100 | 1000 | 10000 | Nelimitat |
| Istoric date | 1 an | 3 ani | 7 ani | Nelimitat |

---

## 4. Schema Prisma - Extensii

```prisma
// ============================================
// ORGANIZAȚII & MULTI-TENANCY
// ============================================

model Organizatie {
  id              String   @id @default(cuid())
  nume            String   // "SC Admin Bloc SRL"
  cui             String?  @unique
  adresa          String?
  email           String?
  telefon         String?
  logo            String?  // URL logo pentru white-label

  // Billing
  emailFacturare  String?

  // Status
  status          OrgStatus @default(ACTIVA)

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  abonament       Abonament?
  utilizatori     UtilizatorOrganizatie[]
  asociatii       Asociatie[]

  // Usage tracking
  usageLogs       UsageLog[]

  @@map("organizatii")
}

enum OrgStatus {
  ACTIVA
  SUSPENDATA    // Plată întârziată
  INCHISA       // Cont închis
  TRIAL         // Perioadă de probă
}

// ============================================
// UTILIZATORI ÎN ORGANIZAȚIE (Roluri per Org)
// ============================================

model UtilizatorOrganizatie {
  id              String   @id @default(cuid())

  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  organizatieId   String
  organizatie     Organizatie @relation(fields: [organizatieId], references: [id], onDelete: Cascade)

  rol             RolOrganizatie @default(MEMBRU)

  // Permisiuni specifice (override default din rol)
  permisiuniCustom String?  @db.Text // JSON array of permission codes

  // Access la asociații specifice (null = toate)
  asociatiiAccess  String[] // array of asociatie IDs, empty = all

  // Status
  esteActiv       Boolean  @default(true)
  invitedAt       DateTime @default(now())
  acceptedAt      DateTime?

  createdAt       DateTime @default(now())

  @@unique([userId, organizatieId])
  @@map("utilizatori_organizatie")
}

enum RolOrganizatie {
  OWNER           // Proprietarul organizației (full access)
  ADMIN           // Administrator (manage users, settings)
  MANAGER         // Manager asociații (CRUD pe date)
  CONTABIL        // Acces doar financiar (read/write financiar)
  OPERATOR        // Operator (înregistrare plăți, indexuri)
  VIZUALIZARE     // Doar citire (rapoarte)
}

// ============================================
// ABONAMENTE & PLANURI
// ============================================

model Plan {
  id              String   @id @default(cuid())
  cod             String   @unique // FREE, STARTER, PRO, ENTERPRISE
  nume            String   // "Plan Gratuit", "Starter", etc.
  descriere       String?

  // Prețuri
  pretPerApartament Float   // lei/apt/lună
  pretMinimLunar    Float   @default(0) // preț minim garantat

  // Module incluse
  moduleIncluse     ModulFunctional[]

  // Limite
  limiteJson        String  @db.Text // JSON cu toate limitele

  // Status
  esteActiv         Boolean @default(true)
  estePublic        Boolean @default(true) // vizibil pe pricing page

  // Ordine afișare
  ordine            Int     @default(0)

  abonamente        Abonament[]

  createdAt         DateTime @default(now())

  @@map("planuri")
}

model ModulFunctional {
  id              String   @id @default(cuid())
  cod             String   @unique // BAZA, FINANCIAR, AUTOMATIZARI, INTEGRARI
  nume            String
  descriere       String?

  // Features din acest modul (pentru UI și verificări)
  featuresJson    String   @db.Text // JSON array of feature codes

  // Care planuri îl includ
  planuri         Plan[]

  @@map("module_functionale")
}

model Abonament {
  id              String   @id @default(cuid())

  organizatieId   String   @unique
  organizatie     Organizatie @relation(fields: [organizatieId], references: [id], onDelete: Cascade)

  planId          String
  plan            Plan     @relation(fields: [planId], references: [id])

  // Status abonament
  status          StatusAbonament @default(TRIAL)

  // Perioadă
  dataStart       DateTime @default(now())
  dataExpirare    DateTime?
  perioadaTrial   DateTime? // când expiră trial-ul

  // Billing
  ciclulFacturare CiclulFacturare @default(LUNAR)
  dataUrmatoareiFacturi DateTime?

  // Stripe
  stripeCustomerId     String?
  stripeSubscriptionId String?

  // Override limite (pentru deals custom)
  limiteCustomJson     String?  @db.Text

  // Module extra achiziționate separat
  moduleExtra          String[] // coduri module

  // Istoric facturi
  facturiAbonament     FacturaAbonament[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("abonamente")
}

enum StatusAbonament {
  TRIAL           // Perioadă de probă
  ACTIV           // Plătit și activ
  EXPIRAT         // Trecut de data expirării
  SUSPENDAT       // Suspendat pentru neplată
  ANULAT          // Anulat de client
}

enum CiclulFacturare {
  LUNAR
  TRIMESTRIAL
  ANUAL
}

model FacturaAbonament {
  id              String   @id @default(cuid())

  abonamentId     String
  abonament       Abonament @relation(fields: [abonamentId], references: [id])

  numar           String   // FA-2024-0001
  dataEmitere     DateTime @default(now())
  dataScadenta    DateTime

  // Detalii
  perioada        String   // "Ianuarie 2024"
  nrApartamente   Int      // câte apt au fost facturate
  pretUnitar      Float    // preț/apt în acel moment

  // Sume
  subtotal        Float
  tva             Float
  total           Float

  // Status
  status          StatusFactura @default(EMISA)
  dataPlatii      DateTime?

  // Stripe
  stripeInvoiceId String?

  createdAt       DateTime @default(now())

  @@map("facturi_abonament")
}

enum StatusFactura {
  DRAFT
  EMISA
  PLATITA
  ANULATA
}

// ============================================
// USAGE TRACKING (pentru limite)
// ============================================

model UsageLog {
  id              String   @id @default(cuid())

  organizatieId   String
  organizatie     Organizatie @relation(fields: [organizatieId], references: [id])

  // Ce s-a folosit
  tipResursa      TipResursa
  cantitate       Int      @default(1)

  // Context
  asociatieId     String?
  userId          String?
  detalii         String?  // JSON cu context extra

  createdAt       DateTime @default(now())

  @@index([organizatieId, tipResursa, createdAt])
  @@map("usage_logs")
}

enum TipResursa {
  AI_REQUEST      // Cerere AI (OCR, predicții)
  EMAIL_SENT      // Email trimis
  DOCUMENT_UPLOAD // Document uploadat
  API_CALL        // Apel API extern
}

// ============================================
// MODIFICĂRI LA MODELELE EXISTENTE
// ============================================

// User - adăugăm legătura la organizații
model User {
  // ... câmpuri existente ...

  // Membership în organizații (înlocuiește relația directă cu asociații pentru admin)
  organizatii     UtilizatorOrganizatie[]

  // Keep existing for backwards compatibility during migration
  // asociatiiAdmin  Asociatie[] @relation("AdminAsociatie")
}

// Asociatie - adăugăm legătura la organizație
model Asociatie {
  // ... câmpuri existente ...

  // Legătura la organizație (noul câmp)
  organizatieId   String?
  organizatie     Organizatie? @relation(fields: [organizatieId], references: [id])

  // Keep adminId for backwards compat / direct ownership
  adminId         String
  admin           User @relation("AdminAsociatie", fields: [adminId], references: [id])
}
```

---

## 5. Feature Flags System

### Structura Features

```typescript
// src/lib/features.ts

export const FEATURES = {
  // Modul BAZĂ
  DASHBOARD: 'dashboard',
  APARTAMENTE_CRUD: 'apartamente.crud',
  PROPRIETARI_CRUD: 'proprietari.crud',
  CHITANTE_VIEW: 'chitante.view',
  CHITANTE_GENERATE: 'chitante.generate',
  AVIZIER_BASIC: 'avizier.basic',

  // Modul FINANCIAR
  INCASARI: 'incasari',
  CHELTUIELI: 'cheltuieli',
  FONDURI: 'fonduri',
  RAPOARTE: 'rapoarte',
  EXPORT_EXCEL: 'export.excel',
  EXPORT_PDF: 'export.pdf',
  PENALIZARI_AUTO: 'penalizari.auto',

  // Modul AUTOMATIZĂRI
  OCR_FACTURI: 'ocr.facturi',
  OCR_INDEXURI: 'ocr.indexuri',
  PREDICTII_AI: 'predictii.ai',
  REMINDERE_AUTO: 'remindere.auto',
  RAPORT_SAPTAMANAL: 'raport.saptamanal',
  CHATBOT_AI: 'chatbot.ai',

  // Modul INTEGRĂRI
  SPV_EFACTURA: 'spv.efactura',
  SMTP_CUSTOM: 'smtp.custom',
  API_ACCESS: 'api.access',
  WEBHOOKS: 'webhooks',
  WHITE_LABEL: 'white.label',
} as const

export type Feature = typeof FEATURES[keyof typeof FEATURES]

// Mapare module -> features
export const MODULE_FEATURES: Record<string, Feature[]> = {
  BAZA: [
    FEATURES.DASHBOARD,
    FEATURES.APARTAMENTE_CRUD,
    FEATURES.PROPRIETARI_CRUD,
    FEATURES.CHITANTE_VIEW,
    FEATURES.CHITANTE_GENERATE,
    FEATURES.AVIZIER_BASIC,
  ],
  FINANCIAR: [
    FEATURES.INCASARI,
    FEATURES.CHELTUIELI,
    FEATURES.FONDURI,
    FEATURES.RAPOARTE,
    FEATURES.EXPORT_EXCEL,
    FEATURES.EXPORT_PDF,
    FEATURES.PENALIZARI_AUTO,
  ],
  AUTOMATIZARI: [
    FEATURES.OCR_FACTURI,
    FEATURES.OCR_INDEXURI,
    FEATURES.PREDICTII_AI,
    FEATURES.REMINDERE_AUTO,
    FEATURES.RAPORT_SAPTAMANAL,
    FEATURES.CHATBOT_AI,
  ],
  INTEGRARI: [
    FEATURES.SPV_EFACTURA,
    FEATURES.SMTP_CUSTOM,
    FEATURES.API_ACCESS,
    FEATURES.WEBHOOKS,
    FEATURES.WHITE_LABEL,
  ],
}
```

### Middleware Feature Check

```typescript
// src/lib/permissions.ts

import { db } from './db'

export async function hasFeature(
  organizatieId: string,
  feature: Feature
): Promise<boolean> {
  const abonament = await db.abonament.findUnique({
    where: { organizatieId },
    include: {
      plan: {
        include: { moduleIncluse: true }
      }
    }
  })

  if (!abonament || abonament.status !== 'ACTIV') {
    // Check if trial is still valid
    if (abonament?.status === 'TRIAL' && abonament.perioadaTrial) {
      if (new Date() > abonament.perioadaTrial) {
        return false
      }
    } else {
      return false
    }
  }

  // Get all feature codes from included modules
  const moduleFeatures = abonament.plan.moduleIncluse.flatMap(m =>
    JSON.parse(m.featuresJson) as string[]
  )

  // Check extra modules
  const extraModules = abonament.moduleExtra || []
  // ... add extra module features

  return moduleFeatures.includes(feature)
}

export async function checkLimit(
  organizatieId: string,
  limitType: 'apartamente' | 'utilizatori' | 'asociatii' | 'storage'
): Promise<{ allowed: boolean; current: number; max: number }> {
  // Implementation for checking usage limits
}
```

### API Route Protection

```typescript
// src/lib/api-guards.ts

import { NextRequest, NextResponse } from 'next/server'
import { hasFeature, checkLimit } from './permissions'

export function withFeatureCheck(feature: Feature) {
  return async function guard(
    request: NextRequest,
    handler: () => Promise<NextResponse>
  ) {
    const organizatieId = await getOrganizatieFromRequest(request)

    if (!organizatieId) {
      return NextResponse.json(
        { error: 'Organizație negăsită' },
        { status: 404 }
      )
    }

    const hasAccess = await hasFeature(organizatieId, feature)

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'Funcționalitate indisponibilă în planul curent',
          code: 'FEATURE_NOT_AVAILABLE',
          feature,
          upgradeUrl: '/dashboard/upgrade'
        },
        { status: 403 }
      )
    }

    return handler()
  }
}
```

---

## 6. Migrare Date Existente

### Strategie

1. **Creare tabele noi** (Organizatie, Plan, Abonament, etc.)
2. **Migrare asociații existente**:
   - Pentru fiecare `asociatie.adminId` unic, creăm o `Organizatie`
   - Legăm asociațiile la organizație
   - Creăm `Abonament` cu plan FREE
3. **Migrare utilizatori**:
   - Admin-ii devin OWNER în organizația lor
   - Proprietarii rămân legați de apartamente

### Script Migrare

```typescript
// scripts/migrate-to-multitenant.ts

async function migrate() {
  // 1. Get all unique admins
  const admins = await db.asociatie.findMany({
    select: { adminId: true, admin: true },
    distinct: ['adminId']
  })

  // 2. Create organization for each admin
  for (const admin of admins) {
    const org = await db.organizatie.create({
      data: {
        nume: `Organizația ${admin.admin.name || admin.admin.email}`,
        email: admin.admin.email,
        status: 'ACTIVA'
      }
    })

    // 3. Link user to organization
    await db.utilizatorOrganizatie.create({
      data: {
        userId: admin.adminId,
        organizatieId: org.id,
        rol: 'OWNER',
        acceptedAt: new Date()
      }
    })

    // 4. Link associations to organization
    await db.asociatie.updateMany({
      where: { adminId: admin.adminId },
      data: { organizatieId: org.id }
    })

    // 5. Create FREE subscription
    const freePlan = await db.plan.findUnique({ where: { cod: 'FREE' } })
    await db.abonament.create({
      data: {
        organizatieId: org.id,
        planId: freePlan!.id,
        status: 'ACTIV',
        dataStart: new Date()
      }
    })
  }
}
```

---

## 7. UI Components Necesare

### Pentru Organizație
- `/dashboard/organizatie` - Setări organizație
- `/dashboard/organizatie/utilizatori` - Gestiune utilizatori
- `/dashboard/organizatie/abonament` - Vizualizare/upgrade plan
- `/dashboard/organizatie/facturi` - Istoric facturi

### Pentru Super Admin
- `/admin/organizatii` - Lista toate organizațiile
- `/admin/planuri` - Gestiune planuri
- `/admin/facturi` - Toate facturile
- `/admin/usage` - Statistici utilizare

### Upgrade Flow
- `/upgrade` - Pagină comparație planuri
- `/upgrade/checkout` - Proces plată Stripe
- `/upgrade/success` - Confirmare upgrade

---

## 8. Notificări pentru Billing

1. **Trial expiring** - 7 zile, 3 zile, 1 zi înainte
2. **Payment failed** - imediat + 3 zile + 7 zile
3. **Subscription renewed** - confirmare plată
4. **Approaching limits** - 80%, 90%, 100%
5. **Plan upgraded** - confirmare
6. **Plan downgraded** - avertisment date care vor fi pierdute

---

## 9. Pași Implementare

### Faza 1: Schema & Migrare (3-5 zile)
- [ ] Adaugă modelele noi în schema.prisma
- [ ] Creează migrare DB
- [ ] Seedează planuri și module
- [ ] Rulează script migrare date existente

### Faza 2: Feature System (2-3 zile)
- [ ] Implementează sistemul de feature flags
- [ ] Creează middleware verificare features
- [ ] Adaugă guards pe rutele existente

### Faza 3: UI Organizație (3-5 zile)
- [ ] Pagini setări organizație
- [ ] Gestiune utilizatori cu roluri
- [ ] Context provider pentru organizație curentă

### Faza 4: Billing (5-7 zile)
- [ ] Integrare Stripe Subscriptions
- [ ] Checkout flow
- [ ] Webhook-uri Stripe
- [ ] Generare facturi

### Faza 5: Admin Panel (3-5 zile)
- [ ] Dashboard super admin
- [ ] Gestiune organizații
- [ ] Rapoarte utilizare

---

## 10. Setări Platformă (Super Admin Configurable)

### Model PlatformSettings

```prisma
// ============================================
// PLATFORM SETTINGS (Super Admin Only)
// ============================================

model PlatformSettings {
  id              String   @id @default("default") // Singleton

  // Trial & Grace Period (configurabile din Super Admin)
  trialDays       Int      @default(14)    // Zile trial cu toate modulele
  graceDays       Int      @default(7)     // Zile după expirare înainte de suspendare

  // Notifications timing
  trialWarningDays    Int[]  @default([7, 3, 1])   // Când să trimită avertismente trial
  paymentWarningDays  Int[]  @default([7, 3, 1])   // Când să trimită avertismente plată

  // Feature toggles (kill switches)
  aiEnabled           Boolean @default(true)
  spvEnabled          Boolean @default(true)
  stripeEnabled       Boolean @default(true)

  // Platform branding (default, poate fi overriden per organizație)
  platformName        String  @default("BlocHub")
  platformLogo        String? // URL logo default
  platformFavicon     String?
  primaryColor        String  @default("#2563eb") // blue-600
  supportEmail        String  @default("support@blochub.ro")

  // Legal
  termsUrl            String?
  privacyUrl          String?

  // Maintenance mode
  maintenanceMode     Boolean @default(false)
  maintenanceMessage  String?

  updatedAt       DateTime @updatedAt
  updatedBy       String?  // userId who last updated

  @@map("platform_settings")
}
```

---

## 11. White-Label Options (Enterprise)

### Elemente Personalizabile per Organizație

| Element | Descriere | Implementare |
|---------|-----------|--------------|
| **Logo** | Logo organizație în header/sidebar | Upload în Setări Org, salvat în storage |
| **Favicon** | Icon browser tab | Upload, generare automat din logo |
| **Culori** | Culoare primară, accent | Color picker, CSS variables |
| **Nume aplicație** | În titlu browser, emails | Text field în setări |
| **Email branding** | Header/footer în emailuri | Template customization |
| **Domeniu custom** | app.firma-ta.ro | DNS CNAME + SSL (viitor) |
| **PDF watermark** | Logo pe rapoarte/chitanțe | Overlay la generare PDF |

### Model WhiteLabel în Organizație

```prisma
// Adăugat în modelul Organizatie
model Organizatie {
  // ... existing fields ...

  // White-label settings (doar pentru Enterprise cu modul INTEGRARI)
  whiteLabel      WhiteLabelConfig?
}

model WhiteLabelConfig {
  id              String   @id @default(cuid())

  organizatieId   String   @unique
  organizatie     Organizatie @relation(fields: [organizatieId], references: [id], onDelete: Cascade)

  // Branding
  logo            String?  // URL to uploaded logo
  logoLight       String?  // Logo pentru dark mode
  favicon         String?
  appName         String?  // ex: "AdminBloc Pro"

  // Culori (CSS hex)
  primaryColor    String?  // #2563eb
  accentColor     String?  // #10b981

  // Email branding
  emailHeaderHtml String?  @db.Text
  emailFooterHtml String?  @db.Text
  emailFromName   String?  // "Administrare Bloc X"

  // Custom domain (future)
  customDomain    String?  @unique
  domainVerified  Boolean  @default(false)
  sslCertId       String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("white_label_configs")
}
```

### Implementare UI White-Label

```
/dashboard/organizatie/branding
├── Logo upload (drag & drop, crop, preview)
├── Color picker (primary, accent)
├── App name customization
├── Email template preview
└── PDF preview cu branding
```

---

## 12. Downgrade Behavior (Read-Only Mode)

### Ce se întâmplă la downgrade

| Situație | Comportament |
|----------|--------------|
| **Peste limită apartamente** | Nu se pot adăuga noi, existentele rămân |
| **Peste limită asociații** | Nu se pot crea noi, existentele rămân |
| **Modul pierdut (ex: Financiar)** | Datele rămân, accesul e read-only |
| **Utilizatori peste limită** | Primii N rămân activi, restul dezactivați |
| **White-label pierdut** | Revine la branding BlocHub default |

### Model pentru Read-Only Mode

```prisma
model Abonament {
  // ... existing fields ...

  // Read-only mode pentru downgrade
  readOnlyModules   String[] // coduri module în read-only

  // Snapshot la momentul downgrade-ului
  downgradeSnapshot String?  @db.Text // JSON cu starea la downgrade
  downgradedAt      DateTime?
  previousPlanId    String?
}
```

### UI pentru Read-Only

```typescript
// Component pentru feature în read-only
function FeatureReadOnlyBanner({ feature }: { feature: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        <Lock className="h-5 w-5 text-amber-600" />
        <div>
          <p className="font-medium text-amber-900">
            Funcționalitate în mod citire
          </p>
          <p className="text-sm text-amber-700">
            Upgrade-ați planul pentru a putea modifica aceste date.
          </p>
        </div>
        <Button size="sm" className="ml-auto">
          Upgrade
        </Button>
      </div>
    </div>
  )
}
```

---

## 13. Decizii Finale

| Întrebare | Decizie | Implementare |
|-----------|---------|--------------|
| Trial period | **Configurabil din Super Admin** | Default 14 zile, `PlatformSettings.trialDays` |
| Grace period | **Configurabil din Super Admin** | Default 7 zile, `PlatformSettings.graceDays` |
| Downgrade | **Read-only** | Datele rămân, accesul limitat |
| White-label logo | **Placeholder + upload din Super Admin** | Default BlocHub, customizable |

---

## 14. Super Admin Dashboard

### Funcționalități Super Admin

```
/admin
├── /dashboard          # Overview platformă
│   ├── Total organizații
│   ├── Total apartamente gestionate
│   ├── Revenue MRR/ARR
│   └── Growth charts
│
├── /organizatii        # Lista & gestiune organizații
│   ├── Search/filter
│   ├── View/edit organization
│   ├── Change plan (override)
│   ├── Suspend/activate
│   └── Login as (impersonate)
│
├── /planuri            # Gestiune planuri
│   ├── Create/edit plans
│   ├── Set pricing
│   ├── Configure modules
│   └── A/B test pricing
│
├── /facturi            # Toate facturile
│   ├── Overview
│   ├── Overdue alerts
│   └── Manual mark paid
│
├── /setari             # Platform settings
│   ├── Trial/grace days
│   ├── Kill switches
│   ├── Default branding
│   └── Maintenance mode
│
└── /logs               # Audit & activity
    ├── User actions
    ├── Payment events
    └── System errors
```

---

## 15. API pentru Verificare Features (Exemplu Complet)

```typescript
// src/lib/subscription.ts

import { db } from './db'
import { Feature, MODULE_FEATURES } from './features'

interface SubscriptionContext {
  organizatieId: string
  planCod: string
  status: string
  features: Feature[]
  limits: {
    apartamente: { current: number; max: number }
    asociatii: { current: number; max: number }
    utilizatori: { current: number; max: number }
  }
  isReadOnly: (feature: Feature) => boolean
  canUse: (feature: Feature) => boolean
}

export async function getSubscriptionContext(
  organizatieId: string
): Promise<SubscriptionContext | null> {
  const abonament = await db.abonament.findUnique({
    where: { organizatieId },
    include: {
      plan: { include: { moduleIncluse: true } },
      organizatie: {
        include: {
          asociatii: { select: { id: true } },
          utilizatori: { where: { esteActiv: true }, select: { id: true } },
        }
      }
    }
  })

  if (!abonament) return null

  // Get platform settings for grace period check
  const settings = await db.platformSettings.findUnique({
    where: { id: 'default' }
  })

  const graceDays = settings?.graceDays || 7
  const now = new Date()

  // Calculate effective status
  let effectiveStatus = abonament.status
  if (abonament.status === 'EXPIRAT') {
    const expiredDate = abonament.dataExpirare || new Date()
    const daysSinceExpired = Math.floor(
      (now.getTime() - expiredDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceExpired > graceDays) {
      effectiveStatus = 'SUSPENDAT'
    }
  }

  // Get all features from modules
  const features = abonament.plan.moduleIncluse.flatMap(m =>
    JSON.parse(m.featuresJson) as Feature[]
  )

  // Parse limits
  const limits = JSON.parse(abonament.plan.limiteJson)
  const customLimits = abonament.limiteCustomJson
    ? JSON.parse(abonament.limiteCustomJson)
    : {}

  // Count current usage
  const currentApartamente = await db.apartament.count({
    where: { asociatie: { organizatieId } }
  })

  return {
    organizatieId,
    planCod: abonament.plan.cod,
    status: effectiveStatus,
    features,
    limits: {
      apartamente: {
        current: currentApartamente,
        max: customLimits.apartamente || limits.apartamente || Infinity
      },
      asociatii: {
        current: abonament.organizatie.asociatii.length,
        max: customLimits.asociatii || limits.asociatii || Infinity
      },
      utilizatori: {
        current: abonament.organizatie.utilizatori.length,
        max: customLimits.utilizatori || limits.utilizatori || Infinity
      }
    },
    isReadOnly: (feature: Feature) => {
      return abonament.readOnlyModules?.some(m =>
        MODULE_FEATURES[m]?.includes(feature)
      ) || false
    },
    canUse: (feature: Feature) => {
      if (effectiveStatus === 'SUSPENDAT') return false
      return features.includes(feature)
    }
  }
}
```
