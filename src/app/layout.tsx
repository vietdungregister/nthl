import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
