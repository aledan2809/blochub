# 🏢 BlocHub - Platformă Inteligentă de Administrare Blocuri

> Sistem 95%+ automatizat cu AI pentru administrarea asociațiilor de proprietari din România

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 📋 Cuprins

- [Despre BlocHub](#-despre-blochub)
- [Features Principale](#-features-principale)
- [Tech Stack](#-tech-stack)
- [Instalare Rapidă](#-instalare-rapid%C4%83)
- [Configurare](#-configurare)
- [Deployment](#-deployment)
- [Arhitectură](#-arhitectur%C4%83)
- [Contributing](#-contributing)

---

## 🎯 Despre BlocHub

BlocHub este o platformă modernă care automatizează 95%+ din taskurile administrative ale asociațiilor de proprietari:

- ✅ **Chitanțe generate în 30 secunde** (nu 30 minute)
- ✅ **Plăți online integrate** (Card, Apple Pay, Google Pay)
- ✅ **6 AI Agents** pentru automatizare completă
- ✅ **Portal Proprietari** cu transparență totală
- ✅ **Sistem de Tichete** pentru sesizări
- ✅ **Multi-Building Support** pentru firme de administrare

### 🤖 AI Agents

1. **OCR Facturi** - Extrage automat date din facturi scanate
2. **OCR Indexuri** - Citește automat indexuri contoare din poze
3. **Calcul Chitanțe** - Generează chitanțe cu repartizare inteligentă
4. **Predicție Plăți** - Identifică apartamente cu risc de întârziere
5. **Chatbot 24/7** - Răspunde automat la întrebări frecvente
6. **Reminder Automat** - Trimite notificări pentru scadențe

---

## ✨ Features Principale

### Pentru Administratori

#### 📊 Dashboard Inteligent
- Statistici real-time: încasări, cheltuieli, restanțe
- Alerte AI pentru acțiuni necesare
- Grafice și vizualizări interactive
- Predicții restanțe bazate pe AI

#### 🏢 Gestionare Clădire
- Multi-building support (gestionează mai multe blocuri)
- Configurare scări și apartamente
- Tipuri predefinite de apartamente
- Date asociație: CUI, IBAN, setări facturare

#### 👥 Gestionare Proprietari
- Import/export Excel
- Coproprietari cu cote-parte
- Contacte urgență
- Istoric plăți complet

#### 💰 Financiar
- Cheltuieli cu repartizare automată pe: consum, cotă indiviză, persoane, fix
- Generare chitanțe în masă (30 sec pentru tot blocul)
- Înregistrare plăți: cash, card, transfer
- Reconciliere automată
- Rapoarte financiare (încasări/cheltuieli pe lună/an)

#### 🧾 Chitanțe Automate
- Generare automată luna 1 (cron job)
- Status tracking: generată, trimisă, plătită, restantă
- Email automat cu chitanța PDF
- Istoric complet pe apartament

#### 📜 Tichete & Sesizări
- Sistem complet de ticketing
- Categorii: defecțiune, curățenie, zgomot, parcare, iluminat
- Priorități: scăzută, normală, urgentă
- Comentarii interne (doar admin) și publice
- Atașare imagini

#### 📈 Rapoarte
- Export date: JSON, CSV, Excel
- Rapoarte încasări/cheltuieli
- Analiza restanțelor
- Audit log complet

### Pentru Proprietari

#### 🏠 Portal Personalizat
- Vizualizare sold și chitanțe
- Istoric plăți
- Plată online integrată
- Notificări email/SMS

#### 📸 Trimitere Indexuri
- Upload poză cu contorul
- OCR automat citește indexul
- Confirmare sau editare manuală

#### 📱 Transparență
- Vizualizare facturi scanate
- Documente asociație (AVG, regulamente)
- Anunțuri importante
- Chat AI pentru întrebări

#### 🔔 Notificări
- Reminder chitanță nouă
- Confirmare plată
- Anunțuri noi
- Răspunsuri la sesizări

---

## 🛠 Tech Stack

### Frontend
- **Next.js 16.1** - React framework cu SSR
- **TypeScript 5.9** - Type safety
- **TailwindCSS 3.4** - Styling
- **Lucide Icons** - Icon library
- **Zustand** - State management

### Backend
- **Next.js API Routes** - Serverless functions
- **Prisma 5.22** - ORM
- **PostgreSQL** - Database (Supabase)
- **NextAuth** - Authentication
- **Zod** - Validation

### AI & Automation
- **OpenAI GPT-4** - AI Chatbot și procesare text
- **Tesseract.js** - OCR local (fallback)
- **EasyOCR** - OCR Python (optional)

### Payments & Services
- **Stripe** - Payment processing
- **Resend** - Email service
- **Vercel** - Hosting & deployment
- **Vercel Cron** - Scheduled jobs

---

## 🚀 Instalare Rapidă

### Prerequisites

```bash
Node.js >= 18.17
PostgreSQL database (Supabase recommended)
OpenAI API key
Stripe account (for payments)
```

### 1. Clone Repository

```bash
git clone https://github.com/your-username/blochub.git
cd blochub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required variables:**
- `DATABASE_URL` - PostgreSQL connection string (port 6543)
- `DIRECT_URL` - Direct PostgreSQL connection (port 5432)
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `OPENAI_API_KEY` - From platform.openai.com/api-keys

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3004](http://localhost:3004)

---

## ⚙ Configurare

### Database (Supabase)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Get connection strings from Settings → Database:
   - **Connection Pooler** (6543) → `DATABASE_URL`
   - **Direct Connection** (5432) → `DIRECT_URL`

### OpenAI

1. Create account at [platform.openai.com](https://platform.openai.com)
2. Generate API key from API Keys section
3. Add to `OPENAI_API_KEY`

### Stripe (Optional)

1. Create account at [stripe.com](https://stripe.com)
2. Get API keys from Dashboard → Developers
3. Configure webhook: `your-domain.com/api/webhooks/stripe`
4. Add keys to `.env`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Email (Optional)

1. Create account at [resend.com](https://resend.com)
2. Verify your domain
3. Get API key and add to `RESEND_API_KEY`

---

## 🌐 Deployment

### Vercel (Recommended)

Detailed deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)

**Quick Deploy:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
npm run deploy
```

### Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generated-secret>
OPENAI_API_KEY=sk-proj-...
STRIPE_SECRET_KEY=sk_live_...
CRON_SECRET=<generated-secret>
```

### Post-Deployment

1. Push database schema: `npx prisma db push`
2. Verify health: `https://your-app.vercel.app`
3. Configure Stripe webhooks
4. Test cron jobs

---

## 🏗 Arhitectură

### Folder Structure

```
blochub/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
├── public/                    # Static assets
├── src/
│   ├── app/
│   │   ├── api/              # API routes (34 endpoints)
│   │   ├── auth/             # Auth pages (login, register)
│   │   ├── dashboard/        # Admin dashboard (13 pages)
│   │   └── portal/           # Proprietari portal
│   ├── agents/               # AI Agents (6 agents)
│   ├── components/
│   │   ├── ui/               # Reusable UI components
│   │   └── ...               # Feature components
│   ├── contexts/             # React contexts
│   ├── lib/                  # Utilities (auth, db, utils)
│   └── types/                # TypeScript types
├── .env                      # Environment variables
├── vercel.json               # Vercel config
└── package.json              # Dependencies
```

### Database Schema

**Core Models:**
- `User` - Utilizatori (admin, proprietari)
- `Asociatie` - Asociații de proprietari
- `Apartament` - Apartamente
- `Scara` - Scări
- `Cheltuiala` - Cheltuieli lunare
- `Chitanta` - Chitanțe generate
- `Plata` - Plăți înregistrate
- `Tichet` - Sesizări/tichete
- `AgentLog` - AI agent activity
- `PredictieRestanta` - Predicții AI

### API Routes

**34 API endpoints organized in:**
- `/api/auth/*` - Authentication
- `/api/dashboard/*` - Dashboard stats
- `/api/apartamente` - Apartments CRUD
- `/api/cheltuieli` - Expenses CRUD
- `/api/chitante` - Invoices CRUD
- `/api/plati` - Payments CRUD
- `/api/tichete` - Tickets CRUD
- `/api/agents/*` - AI agents
- `/api/cron/*` - Scheduled jobs

### AI Agents Architecture

```typescript
// Base Agent Interface
interface AgentInput {
  data: any
  context?: AgentContext
}

interface AgentOutput {
  success: boolean
  data?: any
  error?: string
}

// Agent Factory Pattern
class AgentFactory {
  static register(agent: BaseAgent)
  static run(type: AgentType, input: AgentInput)
}
```

---

## 📚 Documentație

### Pentru Developeri

- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [API Documentation](#) - API endpoints (coming soon)
- [Component Library](#) - UI components (coming soon)

### Pentru Utilizatori

- [User Guide](#) - Ghid utilizare (coming soon)
- [FAQ](#) - Întrebări frecvente (coming soon)
- [Video Tutorials](#) - Tutorial video (coming soon)

---

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build check
npm run build
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Prettier for formatting
- Write meaningful commit messages
- Add JSDoc comments for complex functions
- Test your changes locally before PR

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [OpenAI](https://openai.com/)
- [Stripe](https://stripe.com/)
- [Vercel](https://vercel.com/)
- [TailwindCSS](https://tailwindcss.com/)

---

## 📧 Contact & Support

- **Website:** [blochub.ro](https://blochub.ro)
- **Email:** support@blochub.ro
- **GitHub Issues:** [github.com/your-username/blochub/issues](https://github.com/your-username/blochub/issues)

---

<div align="center">

**Made with ❤️ in Romania**

[⬆ Back to Top](#-blochub---platformă-inteligentă-de-administrare-blocuri)

</div>

