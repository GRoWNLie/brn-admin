import type { Metadata } from 'next'

import './globals.css'
import SessionProvider from '@/components/SessionProvider'

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
