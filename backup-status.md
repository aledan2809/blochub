# BlocHub - Backup Status
**Last Updated**: 2026-01-27
**Session**: Development Session - Penalties & Export Implementation
**Branch**: main (synced with origin)

---

## CURRENT STATUS OVERVIEW

### Recently Completed (This Session - 27 Jan 2026)

**Fix Penalties & Restante Calculation**
- Payments grouped by chitanta's luna/an (not by createdAt date)
- Only previous month payments counted for restanta calculation
- Fixed penalty rate conversion (divide penalizareZi by 100)

**Chitante Generation Agent Fix**
- Calculate penalties per each unpaid chitanta (not just oldest)
- Consistent penalty logic with avizier route

**Email Notifications for Restante**
- Enhanced reminder agent with actual penalty amounts
- New `restantaNotification` email template with rich HTML
- Detailed breakdown: suma restanta, penalizare, total

**Avizier Export (Excel/CSV)**
- New `/api/avizier/export` endpoint (xlsx, csv, json)
- Export buttons added to Avizier page
- Full avizier data with penalties and restante

### Previously Completed
- Sistema Complet de Penalizari si Restante
- Calcul automat penalizari pentru plati intarziate
- UI imbunatatit in Avizier pentru restante
- Interfata configurare penalizari in Setari
- Card informativ despre penalizari in Avizier
- Forgot Password Flow (complete)
- Rapoarte Page cu date reale
- Error Boundaries
- Mobile Responsiveness
- Performance Optimization (lazy loading, memoization)
- Bulk Add Modal pentru apartamente

---

## COMMITS - 27 JAN 2026

```
5351b3d Add Avizier export to Excel and CSV
5a44bcc Add penalty details to email notifications for restante
687f6e4 Fix penalty calculation in chitante generation agent
96f6d0d Fix penalties and restante calculation - use chitanta month for payments
```

All commits pushed to origin/main.

---

## KEY FILES MODIFIED

### Penalties & Restante Calculation
```
src/app/api/avizier/route.ts
  - Lines 109-131: Payments grouped by chitanta month
  - Lines 180-244: Penalty calculation per unpaid month
```

### Chitante Generation
```
src/agents/calcul-chitanta.ts
  - Lines 220-245: Calculate penalties per each unpaid chitanta
  - Fixed rate conversion: penalizareZi / 100
```

### Email Notifications
```
src/agents/reminder.ts
  - Lines 90-98: Calculate penalty for AFTER_DUE reminders
  - Lines 158-215: Message with penalty breakdown

src/lib/email.ts
  - Lines 206-286: New restantaNotification template
```

### Avizier Export
```
src/app/api/avizier/export/route.ts (NEW)
  - Excel (xlsx), CSV, JSON export
  - Full avizier data with penalties

src/app/dashboard/avizier/page.tsx
  - Lines 86-104: handleExport function
  - Lines 243-252: Excel/CSV export buttons
```

---

## PENALTY CALCULATION FORMULA

```typescript
// Formula: Restanta x (Rata% / 100) x Zile intarziere
penalizare = monthlyUnpaid * (penalizareZi / 100) * daysLate

// Example: 1000 lei x 0.02% x 30 zile = 6 lei
// penalizareZi = 0.02 (stored in DB)
// actualRate = 0.02 / 100 = 0.0002
```

**Configuration (Asociatie model):**
- `ziScadenta`: Due date day (1-31, default: 25)
- `penalizareZi`: Daily rate (0-10%, default: 0.02 = 0.02%)

---

## API ENDPOINTS

### `/api/avizier/export` (NEW)
**GET** - Export avizier data

Query params:
- `luna` (number): Month
- `an` (number): Year
- `format` (string): xlsx | csv | json

Response: File download or JSON

### `/api/avizier`
Enhanced response includes:
```typescript
{
  apartamente: [{
    restanta: number,     // Calculated from previous months
    penalizari: number,   // Calculated per unpaid month
    total: number         // Includes restanta + penalizari
  }],
  totaluri: {
    restante: number,
    penalizari: number,
    total: number
  }
}
```

---

## TECHNICAL NOTES

### Payment Attribution
Payments are now correctly attributed to the month they're paying for:
- Uses `chitanta.luna` and `chitanta.an` instead of `plata.createdAt`
- Ensures accurate restanta calculation

### Penalty Calculation Consistency
Both avizier route and chitante agent now use:
- Same formula: `amount * (penalizareZi / 100) * daysLate`
- Per-month calculation (not just oldest unpaid)
- Same due date logic: `new Date(year, month - 1, ziScadenta)`

### Email Templates
New restantaNotification template includes:
- Warning header with gradient (red/orange)
- Detailed payment table
- Penalty calculation breakdown
- Call to action button

---

## TODO / NEXT STEPS

### Immediate
- [ ] Test UI responsiveness on mobile devices
- [ ] Test export functionality with real data

### Short Term
- [ ] PDF export for Avizier (jsPDF already installed)
- [ ] Manual/Consum distribution methods

### Long Term
- [ ] Payment gateway integration
- [ ] Automated reminders (ziScadenta - X days)
- [ ] Historical restante tracking
- [ ] Admin dashboard for penalties overview

---

## TECHNICAL STACK

### Frontend
- **Framework**: Next.js 16.1 (App Router)
- **Language**: TypeScript 5.9
- **UI**: React 18, Tailwind CSS
- **Components**: shadcn/ui
- **Charts**: Recharts
- **Export**: jsPDF, xlsx

### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma 5.22
- **Auth**: NextAuth.js
- **Email**: Resend

---

## PORT & LOCATION

- **Port**: 3004
- **URL**: http://localhost:3004
- **Location**: C:\Projects\blochub
- **GitHub**: https://github.com/aledan2809/blochub.git

---

**END OF BACKUP STATUS**
