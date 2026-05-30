import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import ThemeProvider from '@/components/ThemeProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#4F46E5',
}

export const metadata: Metadata = {
  title: 'NETROTIK — Hotspot Manager',
  description: 'Generate and manage MikroTik hotspot vouchers with ease. Fast, simple, and powerful hotspot voucher manager.',
  icons: {
    icon:      [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut:  [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple:     [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    url: 'https://netrotik.net/',
    siteName: 'NETROTIK',
    title: 'NETROTIK — Hotspot Voucher Manager',
    description: 'Generate and manage MikroTik hotspot vouchers with ease. Fast, simple, and powerful hotspot voucher manager.',
    images: [
      {
        url: 'https://netrotik.net/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_PH',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NETROTIK — Hotspot Voucher Manager',
    description: 'Generate and manage MikroTik hotspot vouchers with ease. Fast, simple, and powerful.',
    images: ['https://netrotik.net/og-image.png'],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${jakarta.variable} ${jetbrains.variable}`}>
      <body className="min-h-full antialiased"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  )
}
