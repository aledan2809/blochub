import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BlocHub - Administrare Blocuri Inteligentă',
  description: 'Platformă modernă de administrare a asociațiilor de proprietari, cu AI și automatizare 95%+',
  keywords: ['administrare bloc', 'asociatie proprietari', 'chitante', 'intretinere', 'romania'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
