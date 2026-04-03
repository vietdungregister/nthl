import type { Metadata } from 'next'
import { Inter, Playfair_Display, Lora } from 'next/font/google'
import './globals.css'

// next/font tự inline CSS, preload, font-display:swap — không blocking render
const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-lora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Nguyễn Thế Hoàng Linh — Thư viện tác phẩm',
    template: '%s — Nguyễn Thế Hoàng Linh',
  },
  description: 'Thư viện tác phẩm chính chủ của nhà thơ Nguyễn Thế Hoàng Linh.',
  openGraph: { siteName: 'Nguyễn Thế Hoàng Linh', type: 'website' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${playfair.variable} ${lora.variable}`}>
      <body>{children}</body>
    </html>
  )
}
