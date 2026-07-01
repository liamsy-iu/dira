import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Dira',
    template: '%s — Dira',
  },
  description: 'QR table ordering and point of sale for Kenyan cafés.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,  // Prevents accidental zoom on POS tablet
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0c0c0c' },
    { media: '(prefers-color-scheme: light)', color: '#f8f7f4' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        {/*
          Theme + service worker init — runs before React hydration.
          Placed at top of body (not head) to avoid React 19 script warning.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('dira-theme');
                if (!t) t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
        {children}
      </body>
    </html>
  )
}
