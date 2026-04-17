import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

export const dynamic = 'force-dynamic'
import './globals.css'
import { Providers } from '@/components/providers'
import { CookieConsentBanner } from '@/components/CookieConsentBanner'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'

const inter = Inter({ subsets: ['latin'] })

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://blochub.ro'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'BlocX - Administrare Blocuri Inteligentă',
    template: '%s | BlocX',
  },
  description: 'Platformă modernă de administrare a asociațiilor de proprietari, cu AI și automatizare 95%+. Generează chitanțe în 30 secunde, plăți online, portal proprietari.',
  keywords: ['administrare bloc', 'asociatie proprietari', 'chitante', 'intretinere', 'romania', 'software administrare', 'plati online bloc'],
  authors: [{ name: 'BlocX' }],
  creator: 'BlocX',
  publisher: 'BlocX',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    url: BASE_URL,
    siteName: 'BlocX',
    title: 'BlocX - Administrare Blocuri Inteligentă',
    description: 'Platformă modernă de administrare a asociațiilor de proprietari, cu AI și automatizare 95%+. Generează chitanțe în 30 secunde.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BlocX - Administrare Blocuri Inteligentă',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BlocX - Administrare Blocuri Inteligentă',
    description: 'Platformă modernă de administrare a asociațiilor de proprietari, cu AI și automatizare 95%+.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'BlocX',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description: 'Platformă modernă de administrare a asociațiilor de proprietari din România, cu AI și automatizare 95%+',
              url: BASE_URL,
              offers: {
                '@type': 'AggregateOffer',
                priceCurrency: 'RON',
                lowPrice: '0',
                highPrice: '1',
                offerCount: '3',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                reviewCount: '150',
              },
              provider: {
                '@type': 'Organization',
                name: 'BlocX',
                url: BASE_URL,
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <GoogleAnalytics />
          {children}
          <CookieConsentBanner />
        </Providers>
      </body>
    </html>
  )
}
