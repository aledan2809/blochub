# 🚀 Ghid Rapid Deploy Vercel pentru BlocHub

## Opțiunea 1: Deploy prin Vercel Dashboard (Recomandat - Cel mai simplu)

### Pasul 1: Conectare la Vercel
1. Mergi pe [vercel.com](https://vercel.com)
2. Click "Sign Up" și autentifică-te cu GitHub
3. Acordă acces la repository-ul `blochub`

### Pasul 2: Import Project
1. Click "Add New" → "Project"
2. Selectează repository-ul `aledan2809/blochub`
3. Click "Import"

### Pasul 3: Configure Project
```
Framework Preset: Next.js (auto-detectat)
Root Directory: ./ (default)
Build Command: npm run build (auto-detectat)
Output Directory: .next (auto-detectat)
Install Command: npm install (auto-detectat)
```

**Important:** NU modifica comenzile - sunt deja configurate în `vercel.json` și `package.json`!

### Pasul 4: Environment Variables

Click "Environment Variables" și adaugă următoarele (TOATE sunt obligatorii):

#### Database (Supabase)
```env
DATABASE_URL=postgresql://postgres.jqiyhjhwepelzctcmbxv:MihDan74!?><@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true

DIRECT_URL=postgresql://postgres.jqiyhjhwepelzctcmbxv:MihDan74!?><@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

#### NextAuth
```env
NEXTAUTH_URL=https://blochub.vercel.app
NEXTAUTH_SECRET=<GENERATE-NEW-SECRET>
```

**Generează NEXTAUTH_SECRET:**
- Windows PowerShell: `[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`
- Linux/Mac: `openssl rand -base64 32`

#### OpenAI
```env
OPENAI_API_KEY=<YOUR-OPENAI-API-KEY>
```

#### App Config
```env
APP_URL=https://blochub.vercel.app
APP_NAME=BlocHub
```

#### Stripe (Opțional - pentru plăți)
```env
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
```

#### Cron Secret
```env
CRON_SECRET=<GENERATE-NEW-SECRET>
```

**Important:**
- Setează Environment pentru: **Production**, **Preview**, și **Development**
- După ce adaugi toate, click "Deploy"

### Pasul 5: Wait for Build
- Build-ul durează 2-3 minute
- Poți urmări progresul în secțiunea "Deployments"

### Pasul 6: Post-Deployment

După ce deployment-ul este gata:

1. **Actualizează NEXTAUTH_URL** cu URL-ul real:
   - Găsești URL-ul în Dashboard (ex: `https://blochub-xxx.vercel.app`)
   - Actualizează variabila `NEXTAUTH_URL` cu acest URL
   - Trigger redeploy (Deployments → Latest → Redeploy)

2. **Verificare**:
   - Deschide `https://your-url.vercel.app`
   - Testează login/register
   - Verifică dashboard

---

## Opțiunea 2: Deploy prin CLI

### Instalare Vercel CLI
```bash
npm i -g vercel
```

### Login
```bash
vercel login
```

### Deploy
```bash
cd C:/Projects/blochub
vercel --prod
```

CLI-ul te va întreba despre environment variables - folosește valorile de mai sus.

---

## 📊 Monitoring Post-Deploy

### 1. Verificare Logs
- Vercel Dashboard → Project → Deployments → Logs
- Caută erori sau warnings

### 2. Test Health Checks
```bash
curl https://your-url.vercel.app/api/auth/csrf
# Trebuie să returneze: {"csrfToken":"..."}
```

### 3. Verificare Cron Jobs
- Vercel Dashboard → Project → Cron Jobs
- Verifică că toate 4 cron jobs sunt active:
  - Mark Restante (1 AM zilnic)
  - Send Reminders (8 AM zilnic)
  - Update Predictions (2 AM, ziua 1)
  - Generate Chitante (6 AM, ziua 1)

---

## 🔧 Troubleshooting

### Build Failed
**Eroare:** `Prisma generate failed`
**Soluție:** Verifică că `DATABASE_URL` și `DIRECT_URL` sunt setate corect

**Eroare:** `Module not found`
**Soluție:** Șterge `.next` folder și re-deploy

### Runtime Errors
**Eroare:** `Unauthorized` pe toate API-urile
**Soluție:** Verifică `NEXTAUTH_SECRET` și `NEXTAUTH_URL`

**Eroare:** `OpenAI API error`
**Soluție:** Verifică `OPENAI_API_KEY` - asigură-te că are credite

### Database Connection
**Eroare:** `Can't reach database server`
**Soluție:**
- Verifică că folosești port 6543 pentru `DATABASE_URL`
- Verifică că Supabase project nu este pausat (free tier se pause după 1 săptămână inactivitate)

---

## 🌐 Custom Domain (Opțional)

### Adaugă domeniu propriu (ex: blochub.ro)

1. Vercel Dashboard → Project → Settings → Domains
2. Click "Add Domain"
3. Introdu `blochub.ro`
4. Urmează instrucțiunile pentru configurare DNS:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
5. După verificare (1-48 ore), actualizează:
   - `NEXTAUTH_URL=https://blochub.ro`
   - `APP_URL=https://blochub.ro`

---

## 🔐 Security Checklist Post-Deploy

- [ ] `NEXTAUTH_SECRET` generat nou (nu același ca în development)
- [ ] `CRON_SECRET` generat nou
- [ ] Toate API keys sunt setate
- [ ] `NEXTAUTH_URL` folosește domeniul corect
- [ ] HTTPS este activat (default în Vercel)
- [ ] Database credentials sunt sigure
- [ ] Stripe este în Live Mode (dacă folosești plăți)

---

## 📈 Next Steps După Deploy

1. **Testare Completă:**
   - Înregistrare utilizator nou
   - Creare asociație
   - Adăugare apartamente
   - Generare chitanțe

2. **Setup Email:**
   - Configurează Resend pentru email-uri
   - Testează notificări

3. **Setup Stripe:**
   - Configurează webhook: `https://your-url.vercel.app/api/webhooks/stripe`
   - Testează plăți

4. **Monitoring:**
   - Activează Vercel Analytics
   - Setup Sentry pentru error tracking (opțional)

---

## 🆘 Suport

Dacă întâmpini probleme:
1. Verifică logs în Vercel Dashboard
2. Verifică `DEPLOYMENT.md` pentru detalii
3. GitHub Issues: [aledan2809/blochub/issues](https://github.com/aledan2809/blochub/issues)

---

**🎉 Felicitări! BlocHub este acum LIVE! 🎉**
