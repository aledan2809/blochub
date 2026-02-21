/**
 * Feature Flags System for BlocHub Multi-Tenant Architecture
 *
 * This module defines all features available in the platform and maps them
 * to functional modules. Used for checking feature access based on subscription plans.
 */

// ============================================
// FEATURE CONSTANTS
// ============================================

export const FEATURES = {
  // Modul BAZA (Core) - Always available in free plan
  DASHBOARD: 'dashboard',
  APARTAMENTE_CRUD: 'apartamente.crud',
  PROPRIETARI_CRUD: 'proprietari.crud',
  CHITANTE_VIEW: 'chitante.view',
  CHITANTE_GENERATE: 'chitante.generate',
  AVIZIER_BASIC: 'avizier.basic',

  // Modul FINANCIAR - Starter plan and above
  INCASARI: 'incasari',
  CHELTUIELI: 'cheltuieli',
  FONDURI: 'fonduri',
  RAPOARTE: 'rapoarte',
  EXPORT_EXCEL: 'export.excel',
  EXPORT_PDF: 'export.pdf',
  PENALIZARI_AUTO: 'penalizari.auto',

  // Modul AUTOMATIZARI - Pro plan and above
  OCR_FACTURI: 'ocr.facturi',
  OCR_INDEXURI: 'ocr.indexuri',
  PREDICTII_AI: 'predictii.ai',
  REMINDERE_AUTO: 'remindere.auto',
  RAPORT_SAPTAMANAL: 'raport.saptamanal',
  CHATBOT_AI: 'chatbot.ai',

  // Modul INTEGRARI - Enterprise plan only
  SPV_EFACTURA: 'spv.efactura',
  SMTP_CUSTOM: 'smtp.custom',
  API_ACCESS: 'api.access',
  WEBHOOKS: 'webhooks',
  WHITE_LABEL: 'white.label',
} as const

export type Feature = (typeof FEATURES)[keyof typeof FEATURES]

// ============================================
// MODULE -> FEATURES MAPPING
// ============================================

export const MODULE_CODES = {
  BAZA: 'BAZA',
  FINANCIAR: 'FINANCIAR',
  AUTOMATIZARI: 'AUTOMATIZARI',
  INTEGRARI: 'INTEGRARI',
} as const

export type ModuleCode = (typeof MODULE_CODES)[keyof typeof MODULE_CODES]

export const MODULE_FEATURES: Record<ModuleCode, Feature[]> = {
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

// ============================================
// PLAN CODES
// ============================================

export const PLAN_CODES = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE',
} as const

export type PlanCode = (typeof PLAN_CODES)[keyof typeof PLAN_CODES]

// Default modules per plan (mirrors what's in the database)
export const PLAN_MODULES: Record<PlanCode, ModuleCode[]> = {
  FREE: ['BAZA'],
  STARTER: ['BAZA', 'FINANCIAR'],
  PRO: ['BAZA', 'FINANCIAR', 'AUTOMATIZARI'],
  ENTERPRISE: ['BAZA', 'FINANCIAR', 'AUTOMATIZARI', 'INTEGRARI'],
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all features available for a given module
 */
export function getModuleFeatures(moduleCode: ModuleCode): Feature[] {
  return MODULE_FEATURES[moduleCode] || []
}

/**
 * Get all features available for a given plan
 */
export function getPlanFeatures(planCode: PlanCode): Feature[] {
  const modules = PLAN_MODULES[planCode] || []
  return modules.flatMap((m) => getModuleFeatures(m))
}

/**
 * Check if a feature belongs to a specific module
 */
export function isFeatureInModule(feature: Feature, moduleCode: ModuleCode): boolean {
  return MODULE_FEATURES[moduleCode]?.includes(feature) || false
}

/**
 * Get the module that contains a specific feature
 */
export function getFeatureModule(feature: Feature): ModuleCode | null {
  for (const [moduleCode, features] of Object.entries(MODULE_FEATURES)) {
    if (features.includes(feature)) {
      return moduleCode as ModuleCode
    }
  }
  return null
}

/**
 * Check if a plan has access to a feature (static check, doesn't query DB)
 */
export function planHasFeature(planCode: PlanCode, feature: Feature): boolean {
  const features = getPlanFeatures(planCode)
  return features.includes(feature)
}

// ============================================
// LIMIT TYPES
// ============================================

export interface PlanLimits {
  asociatii: number // -1 for unlimited
  apartamente: number
  utilizatori: number
  storageMB: number
  aiRequests: number
  emailsPerMonth: number
  istoricAni: number
}

export const DEFAULT_LIMITS: Record<PlanCode, PlanLimits> = {
  FREE: {
    asociatii: 1,
    apartamente: 30,
    utilizatori: 1,
    storageMB: 100,
    aiRequests: 0,
    emailsPerMonth: 100,
    istoricAni: 1,
  },
  STARTER: {
    asociatii: 3,
    apartamente: 200,
    utilizatori: 5,
    storageMB: 1024,
    aiRequests: 0,
    emailsPerMonth: 1000,
    istoricAni: 3,
  },
  PRO: {
    asociatii: 10,
    apartamente: 1000,
    utilizatori: 20,
    storageMB: 10240,
    aiRequests: 500,
    emailsPerMonth: 10000,
    istoricAni: 7,
  },
  ENTERPRISE: {
    asociatii: -1,
    apartamente: -1,
    utilizatori: -1,
    storageMB: 102400,
    aiRequests: -1,
    emailsPerMonth: -1,
    istoricAni: -1,
  },
}

/**
 * Check if a limit value means "unlimited"
 */
export function isUnlimited(value: number): boolean {
  return value === -1
}

/**
 * Format a limit value for display
 */
export function formatLimit(value: number): string {
  if (isUnlimited(value)) return 'Nelimitat'
  return value.toLocaleString('ro-RO')
}

// ============================================
// FEATURE DISPLAY INFO
// ============================================

export interface FeatureInfo {
  code: Feature
  name: string
  description: string
  module: ModuleCode
}

export const FEATURE_INFO: Record<Feature, Omit<FeatureInfo, 'code'>> = {
  // BAZA
  [FEATURES.DASHBOARD]: {
    name: 'Dashboard',
    description: 'Panou principal cu statistici și informații',
    module: 'BAZA',
  },
  [FEATURES.APARTAMENTE_CRUD]: {
    name: 'Gestiune Apartamente',
    description: 'Adăugare, editare, ștergere apartamente',
    module: 'BAZA',
  },
  [FEATURES.PROPRIETARI_CRUD]: {
    name: 'Gestiune Proprietari',
    description: 'Adăugare, editare, ștergere proprietari și chiriași',
    module: 'BAZA',
  },
  [FEATURES.CHITANTE_VIEW]: {
    name: 'Vizualizare Chitanțe',
    description: 'Vizualizare chitanțe generate',
    module: 'BAZA',
  },
  [FEATURES.CHITANTE_GENERATE]: {
    name: 'Generare Chitanțe',
    description: 'Generare automată chitanțe lunare',
    module: 'BAZA',
  },
  [FEATURES.AVIZIER_BASIC]: {
    name: 'Avizier',
    description: 'Afișaj digital obligații lunare',
    module: 'BAZA',
  },

  // FINANCIAR
  [FEATURES.INCASARI]: {
    name: 'Încasări',
    description: 'Înregistrare și gestionare plăți',
    module: 'FINANCIAR',
  },
  [FEATURES.CHELTUIELI]: {
    name: 'Cheltuieli',
    description: 'Gestionare facturi furnizori',
    module: 'FINANCIAR',
  },
  [FEATURES.FONDURI]: {
    name: 'Fonduri',
    description: 'Gestionare fond rulment și reparații',
    module: 'FINANCIAR',
  },
  [FEATURES.RAPOARTE]: {
    name: 'Rapoarte',
    description: 'Rapoarte financiare detaliate',
    module: 'FINANCIAR',
  },
  [FEATURES.EXPORT_EXCEL]: {
    name: 'Export Excel',
    description: 'Export date în format Excel',
    module: 'FINANCIAR',
  },
  [FEATURES.EXPORT_PDF]: {
    name: 'Export PDF',
    description: 'Export rapoarte în format PDF',
    module: 'FINANCIAR',
  },
  [FEATURES.PENALIZARI_AUTO]: {
    name: 'Penalizări Automate',
    description: 'Calcul automat penalizări restanțe',
    module: 'FINANCIAR',
  },

  // AUTOMATIZARI
  [FEATURES.OCR_FACTURI]: {
    name: 'OCR Facturi',
    description: 'Extragere automată date din facturi',
    module: 'AUTOMATIZARI',
  },
  [FEATURES.OCR_INDEXURI]: {
    name: 'OCR Indexuri',
    description: 'Citire automată indexuri contoare',
    module: 'AUTOMATIZARI',
  },
  [FEATURES.PREDICTII_AI]: {
    name: 'Predicții AI',
    description: 'Predicții restanțe bazate pe istoric',
    module: 'AUTOMATIZARI',
  },
  [FEATURES.REMINDERE_AUTO]: {
    name: 'Remindere Automate',
    description: 'Trimitere automată remindere plată',
    module: 'AUTOMATIZARI',
  },
  [FEATURES.RAPORT_SAPTAMANAL]: {
    name: 'Raport Săptămânal',
    description: 'Sumar automat trimis săptămânal',
    module: 'AUTOMATIZARI',
  },
  [FEATURES.CHATBOT_AI]: {
    name: 'Chatbot AI',
    description: 'Asistent virtual pentru proprietari',
    module: 'AUTOMATIZARI',
  },

  // INTEGRARI
  [FEATURES.SPV_EFACTURA]: {
    name: 'SPV / e-Factura',
    description: 'Integrare ANAF pentru facturi electronice',
    module: 'INTEGRARI',
  },
  [FEATURES.SMTP_CUSTOM]: {
    name: 'SMTP Custom',
    description: 'Configurare server email propriu',
    module: 'INTEGRARI',
  },
  [FEATURES.API_ACCESS]: {
    name: 'Acces API',
    description: 'Acces la API pentru integrări externe',
    module: 'INTEGRARI',
  },
  [FEATURES.WEBHOOKS]: {
    name: 'Webhooks',
    description: 'Notificări webhook pentru evenimente',
    module: 'INTEGRARI',
  },
  [FEATURES.WHITE_LABEL]: {
    name: 'White Label',
    description: 'Branding personalizat (logo, culori)',
    module: 'INTEGRARI',
  },
}

/**
 * Get display info for a feature
 */
export function getFeatureInfo(feature: Feature): FeatureInfo {
  const info = FEATURE_INFO[feature]
  return {
    code: feature,
    ...info,
  }
}

// ============================================
// MODULE DISPLAY INFO
// ============================================

export interface ModuleInfo {
  code: ModuleCode
  name: string
  description: string
  icon: string // Lucide icon name
}

export const MODULE_INFO: Record<ModuleCode, Omit<ModuleInfo, 'code'>> = {
  BAZA: {
    name: 'Bază (Core)',
    description: 'Funcționalități esențiale pentru gestiunea asociației',
    icon: 'Home',
  },
  FINANCIAR: {
    name: 'Financiar',
    description: 'Gestiune completă încasări, cheltuieli și rapoarte',
    icon: 'Wallet',
  },
  AUTOMATIZARI: {
    name: 'Automatizări',
    description: 'Funcționalități AI și automatizări inteligente',
    icon: 'Sparkles',
  },
  INTEGRARI: {
    name: 'Integrări',
    description: 'Integrări externe și personalizare avansată',
    icon: 'Plug',
  },
}

/**
 * Get display info for a module
 */
export function getModuleInfo(moduleCode: ModuleCode): ModuleInfo {
  const info = MODULE_INFO[moduleCode]
  return {
    code: moduleCode,
    ...info,
  }
}
