import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
// import { ClerkProvider } from '@clerk/nextjs' // TEMPORARILY DISABLED - No Clerk credentials
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Voice Agent SaaS Platform',
  description: 'Multi-tenant SaaS platform for custom voice call agents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // <ClerkProvider> // TEMPORARILY DISABLED
      <html lang="en">
        <body className={inter.className}>
          <Providers>{children}</Providers>
        </body>
      </html>
    // </ClerkProvider> // TEMPORARILY DISABLED
  )
}
