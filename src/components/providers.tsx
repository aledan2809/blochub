'use client'

import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/toast'
import { I18nProvider } from '@/modules/i18n'
import { GamificationProvider } from '@/components/gamification/gamification-provider'
import { AchievementToast } from '@/components/gamification/achievement-toast'
import { LevelUpCelebration } from '@/components/gamification/level-up-celebration'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <GamificationProvider>
          <ToastProvider>
            {children}
            <AchievementToast />
            <LevelUpCelebration />
          </ToastProvider>
        </GamificationProvider>
      </I18nProvider>
    </SessionProvider>
  )
}
