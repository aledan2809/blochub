'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  CreditCard,
  Building2,
  Shield,
  Palette,
  Loader2,
  Save,
  AlertTriangle,
} from 'lucide-react'

interface PlatformSettings {
  // Trial & Grace
  trialDays: number
  graceDays: number

  // Feature toggles
  aiEnabled: boolean
  spvEnabled: boolean
  stripeEnabled: boolean

  // Platform branding
  platformName: string
  platformLogo: string | null
  primaryColor: string
  supportEmail: string

  // Legal
  termsUrl: string | null
  privacyUrl: string | null

  // Maintenance
  maintenanceMode: boolean
  maintenanceMessage: string | null

  // Revolut
  revolutEnabled: boolean
  revolutEnvironment: string
  revolutApiKey: string | null
  revolutWebhookSecret: string | null

  // Company
  companyName: string
  companyCui: string | null
  companyRegCom: string | null
  companyAddress: string | null
  companyCity: string | null
  companyCounty: string | null
  companyCountry: string
  companyIban: string | null
  companyBank: string | null
  companyEmail: string | null
  companyPhone: string | null
  companyIsVatPayer: boolean
  vatRate: number
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<PlatformSettings | null>(null)

  // Check authorization
  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchSettings()
  }, [session, status, router])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        toast.error('Eroare la încărcarea setărilor')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Eroare de conexiune')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        toast.success('Setările au fost salvate cu succes')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Eroare la salvare')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Eroare de conexiune')
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: keyof PlatformSettings, value: unknown) => {
    if (!settings) return
    setSettings({ ...settings, [field]: value })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <p>Nu s-au putut încărca setările platformei.</p>
            <Button onClick={fetchSettings} className="mt-4">
              Reîncearcă
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Setări Platformă
          </h1>
          <p className="text-muted-foreground mt-1">
            Configurări globale pentru BlocHub (Super Admin)
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvează
        </Button>
      </div>

      <Tabs defaultValue="payments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Plăți
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Companie
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Funcționalități
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Branding
          </TabsTrigger>
        </TabsList>

        {/* PAYMENTS TAB */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Revolut Payment Gateway
              </CardTitle>
              <CardDescription>
                Configurare Revolut Merchant API pentru plăți abonamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Activare plăți Revolut</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite organizațiilor să plătească abonamentul cu cardul
                  </p>
                </div>
                <Switch
                  checked={settings.revolutEnabled}
                  onCheckedChange={(checked) => updateField('revolutEnabled', checked)}
                />
              </div>

              <Separator />

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="revolutEnvironment">Mediu</Label>
                  <Select
                    value={settings.revolutEnvironment}
                    onValueChange={(value) => updateField('revolutEnvironment', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                      <SelectItem value="production">Production (Live)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="revolutApiKey">API Key</Label>
                  <Input
                    id="revolutApiKey"
                    type="password"
                    placeholder="sk_xxx..."
                    value={settings.revolutApiKey || ''}
                    onChange={(e) => updateField('revolutApiKey', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Din Revolut Business → Merchant API → API Key
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="revolutWebhookSecret">Webhook Secret</Label>
                  <Input
                    id="revolutWebhookSecret"
                    type="password"
                    placeholder="whsec_xxx..."
                    value={settings.revolutWebhookSecret || ''}
                    onChange={(e) => updateField('revolutWebhookSecret', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Webhook URL: {process.env.NEXTAUTH_URL || 'https://app.blochub.ro'}
                    /api/billing/webhook
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="trialDays">Zile Trial</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    min={0}
                    max={90}
                    value={settings.trialDays}
                    onChange={(e) => updateField('trialDays', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="graceDays">Zile Grație</Label>
                  <Input
                    id="graceDays"
                    type="number"
                    min={0}
                    max={30}
                    value={settings.graceDays}
                    onChange={(e) => updateField('graceDays', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPANY TAB */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Date Companie (Facturare)
              </CardTitle>
              <CardDescription>
                Informațiile care vor apărea pe facturile emise către clienți
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyName">Denumire firmă *</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyCui">CUI / CIF</Label>
                  <Input
                    id="companyCui"
                    placeholder="RO12345678"
                    value={settings.companyCui || ''}
                    onChange={(e) => updateField('companyCui', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyRegCom">Nr. Reg. Comerțului</Label>
                  <Input
                    id="companyRegCom"
                    placeholder="J40/1234/2024"
                    value={settings.companyRegCom || ''}
                    onChange={(e) => updateField('companyRegCom', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyEmail">Email facturare</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    placeholder="facturare@blochub.ro"
                    value={settings.companyEmail || ''}
                    onChange={(e) => updateField('companyEmail', e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="companyAddress">Adresă sediu</Label>
                <Input
                  id="companyAddress"
                  placeholder="Str. Exemplu nr. 10"
                  value={settings.companyAddress || ''}
                  onChange={(e) => updateField('companyAddress', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyCity">Oraș</Label>
                  <Input
                    id="companyCity"
                    placeholder="București"
                    value={settings.companyCity || ''}
                    onChange={(e) => updateField('companyCity', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyCounty">Județ</Label>
                  <Input
                    id="companyCounty"
                    placeholder="București"
                    value={settings.companyCounty || ''}
                    onChange={(e) => updateField('companyCounty', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyCountry">Țară</Label>
                  <Input
                    id="companyCountry"
                    value={settings.companyCountry}
                    onChange={(e) => updateField('companyCountry', e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyIban">IBAN</Label>
                  <Input
                    id="companyIban"
                    placeholder="RO00XXXX0000000000000000"
                    value={settings.companyIban || ''}
                    onChange={(e) => updateField('companyIban', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyBank">Banca</Label>
                  <Input
                    id="companyBank"
                    placeholder="Banca Transilvania"
                    value={settings.companyBank || ''}
                    onChange={(e) => updateField('companyBank', e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Plătitor de TVA</Label>
                  <p className="text-sm text-muted-foreground">
                    Facturile vor include TVA
                  </p>
                </div>
                <Switch
                  checked={settings.companyIsVatPayer}
                  onCheckedChange={(checked) => updateField('companyIsVatPayer', checked)}
                />
              </div>

              {settings.companyIsVatPayer && (
                <div className="grid gap-2 max-w-xs">
                  <Label htmlFor="vatRate">Cotă TVA (%)</Label>
                  <Input
                    id="vatRate"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={settings.vatRate}
                    onChange={(e) => updateField('vatRate', parseFloat(e.target.value) || 0.19)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: 0.19 pentru 19%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEATURES TAB */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Funcționalități Platformă
              </CardTitle>
              <CardDescription>
                Activare/dezactivare globală a funcționalităților
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Funcționalități AI</Label>
                  <p className="text-sm text-muted-foreground">
                    OCR facturi, predicții, chatbot
                  </p>
                </div>
                <Switch
                  checked={settings.aiEnabled}
                  onCheckedChange={(checked) => updateField('aiEnabled', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Integrare SPV / e-Factura</Label>
                  <p className="text-sm text-muted-foreground">
                    Sincronizare facturi cu ANAF
                  </p>
                </div>
                <Switch
                  checked={settings.spvEnabled}
                  onCheckedChange={(checked) => updateField('spvEnabled', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Plăți online (Stripe)</Label>
                  <p className="text-sm text-muted-foreground">
                    Plăți proprietari către asociații
                  </p>
                </div>
                <Switch
                  checked={settings.stripeEnabled}
                  onCheckedChange={(checked) => updateField('stripeEnabled', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-amber-600">Mod Mentenanță</Label>
                  <p className="text-sm text-muted-foreground">
                    Blochează accesul utilizatorilor la platformă
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => updateField('maintenanceMode', checked)}
                />
              </div>

              {settings.maintenanceMode && (
                <div className="grid gap-2">
                  <Label htmlFor="maintenanceMessage">Mesaj mentenanță</Label>
                  <Input
                    id="maintenanceMessage"
                    placeholder="Platforma este în mentenanță. Revenim în curând."
                    value={settings.maintenanceMessage || ''}
                    onChange={(e) => updateField('maintenanceMessage', e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BRANDING TAB */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Branding Platformă
              </CardTitle>
              <CardDescription>
                Personalizare aspect și informații de contact
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="platformName">Nume platformă</Label>
                  <Input
                    id="platformName"
                    value={settings.platformName}
                    onChange={(e) => updateField('platformName', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="primaryColor">Culoare principală</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      value={settings.primaryColor}
                      onChange={(e) => updateField('primaryColor', e.target.value)}
                    />
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => updateField('primaryColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="supportEmail">Email suport</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => updateField('supportEmail', e.target.value)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="termsUrl">URL Termeni și Condiții</Label>
                  <Input
                    id="termsUrl"
                    type="url"
                    placeholder="https://blochub.ro/termeni"
                    value={settings.termsUrl || ''}
                    onChange={(e) => updateField('termsUrl', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="privacyUrl">URL Politică Confidențialitate</Label>
                  <Input
                    id="privacyUrl"
                    type="url"
                    placeholder="https://blochub.ro/confidentialitate"
                    value={settings.privacyUrl || ''}
                    onChange={(e) => updateField('privacyUrl', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="platformLogo">URL Logo</Label>
                <Input
                  id="platformLogo"
                  type="url"
                  placeholder="https://blochub.ro/logo.png"
                  value={settings.platformLogo || ''}
                  onChange={(e) => updateField('platformLogo', e.target.value)}
                />
                {settings.platformLogo && (
                  <div className="mt-2">
                    <img
                      src={settings.platformLogo}
                      alt="Logo preview"
                      className="h-12 object-contain"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
