# 🚀 Ghid Deployment Blochub pe Vercel

## Pregătire înainte de deployment

### 1. Database Setup (Supabase)

1. Creează un cont pe [Supabase](https://supabase.com)
2. Creează un nou proiect
3. În Settings → Database, găsești:
   - **Connection Pooler** (port 6543) → `DATABASE_URL`
   - **Direct Connection** (port 5432) → `DIRECT_URL`

### 2. Generare Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -base64 32
```

### 3. OpenAI API Key

1. Mergi la [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Creează un nou API key
3. Copiază-l pentru `OPENAI_API_KEY`

### 4. Stripe Setup (pentru plăți)

1. Creează cont pe [Stripe](https://stripe.com)
2. Obține API keys din Dashboard → Developers → API keys
3. Configurează webhook pentru `/api/webhooks/stripe`

### 5. Resend (pentru email-uri)

1. Creează cont pe [Resend](https://resend.com)
2. Obține API key
3. Verifică domeniul pentru trimitere email-uri

---

## Deployment pe Vercel

### Pas 1: Conectare Repository

1. Mergi pe [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Importă repository-ul Git (GitHub/GitLab/Bitbucket)

### Pas 2: Configurare Proiect

```
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build (default)
Output Directory: .next (default)
Install Command: npm install (default)
```

### Pas 3: Environment Variables

În Vercel Dashboard → Project Settings → Environment Variables, adaugă:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=generated-secret-32-chars
OPENAI_API_KEY=sk-proj-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
CRON_SECRET=your-cron-secret
RESEND_API_KEY=re_...
APP_URL=https://your-app.vercel.app
APP_NAME=BlocHub
```

**Important:** Setează Environment pentru **Production**, **Preview**, și **Development**.

### Pas 4: Deploy

1. Click "Deploy"
2. Așteaptă build-ul (2-3 minute)
3. Verifică logs pentru erori

---

## Post-Deployment

### 1. Database Migrations

După primul deployment, rulează migrations:

```bash
# Connect to production database
npx prisma db push
```

Sau folosește Supabase SQL Editor pentru a rula migrations manual.

### 2. Seed Data (opțional)

```bash
npm run db:seed
```

### 3. Verificare Health Check

Testează endpoint-urile:
- `https://your-app.vercel.app` → Landing page
- `https://your-app.vercel.app/api/auth/csrf` → Auth status
- `https://your-app.vercel.app/auth/login` → Login page

### 4. Configurare Domeniu Custom

1. În Vercel → Project Settings → Domains
2. Adaugă domeniul tău (ex: `blochub.ro`)
3. Configurează DNS records conform instrucțiunilor
4. Actualizează `NEXTAUTH_URL` și `APP_URL` cu noul domeniu

### 5. Stripe Webhooks

1. În Stripe Dashboard → Webhooks
2. Adaugă endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. Selectează events: `checkout.session.completed`, `payment_intent.succeeded`, etc.
4. Copiază Webhook Secret în `STRIPE_WEBHOOK_SECRET`

### 6. Cron Jobs (pentru remindere automate)

Vercel Cron este activat automat din `vercel.json`. Verifică în:
- Project Settings → Cron Jobs

---

## Monitoring & Maintenance

### Logs

```bash
# View deployment logs
vercel logs your-app

# View function logs
vercel logs your-app --function=api/dashboard/stats
```

### Performance

- Verifică [Vercel Analytics](https://vercel.com/analytics)
- Monitorizează [Web Vitals](https://vercel.com/docs/concepts/analytics)

### Backups

Supabase face backup automat zilnic. Pentru backup manual:
1. Supabase Dashboard → Database → Backups
2. Download backup

---

## Troubleshooting

### Build Errors

```bash
# Test build local
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

### Database Connection Issues

- Verifică că `DATABASE_URL` folosește port `6543` (pooler)
- Verifică că `DIRECT_URL` folosește port `5432`
- Verifică whitelist IP în Supabase (Vercel IPs sunt automat permise)

### API Rate Limits

- OpenAI: 3 RPM (tier free), upgrade pentru production
- Supabase: 2 connections simultan (tier free)

### Erori comune

**"Failed to fetch"** → Verifică CORS și environment variables
**"Prisma error"** → Rulează `npx prisma generate` local și re-deploy
**"NextAuth error"** → Verifică `NEXTAUTH_URL` și `NEXTAUTH_SECRET`

---

## CI/CD Pipeline

Vercel face deploy automat la:
- **Production**: push pe `main` branch
- **Preview**: pull requests

### Disable Auto-Deploy (opțional)

În `vercel.json`:
```json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "feature/*": false
    }
  }
}
```

---

## Security Checklist

- [ ] Toate API keys sunt în Environment Variables (nu în cod)
- [ ] `NEXTAUTH_SECRET` generat cu OpenSSL (min 32 chars)
- [ ] Database credentials sigure
- [ ] Stripe în Live Mode (nu Test)
- [ ] Rate limiting activat
- [ ] CORS configurat corect
- [ ] HTTPS forțat (default în Vercel)

---

## Rollback

Pentru rollback la versiune anterioară:
1. Vercel Dashboard → Deployments
2. Găsește deployment-ul funcțional
3. Click "..." → "Promote to Production"

---

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)
