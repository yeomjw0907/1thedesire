import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { FontLoader } from '@/components/FontLoader'
import { AppWidthContainer } from '@/components/layout/AppWidthContainer'
import './globals.css'

export const metadata: Metadata = {
  title: '욕망백서',
  description: '분위기를 먼저 보고, 대화는 그 다음에. 취향을 안전하게 나누는 익명 플랫폼.',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: '욕망백서',
    description: '분위기를 먼저 보고, 대화는 그 다음에.',
    locale: 'ko_KR',
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '욕망백서',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0B0D',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-bg-900 text-text-primary antialiased">
        <FontLoader />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <AppWidthContainer>{children}</AppWidthContainer>
        <Toaster
          position="top-center"
          gap={8}
          toastOptions={{
            style: {
              background: '#1D1D22',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#DDD6CF',
              fontSize: '14px',
              borderRadius: '14px',
              padding: '14px 18px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            },
            classNames: {
              error: 'toast-error',
              success: 'toast-success',
              info: 'toast-info',
            },
          }}
        />
      </body>
    </html>
  )
}
