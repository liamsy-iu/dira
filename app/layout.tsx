import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: { default: 'Dira', template: '%s — Dira' },
  description: 'QR table ordering and point of sale for Kenyan cafés.',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0c0c0c' },
    { media: '(prefers-color-scheme: light)', color: '#f8f7f4' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {/* Script 1: theme init — prevents flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('dira-theme');
            if (!t) t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        `}} />

        {/* Script 2: data prefetch — fires Supabase fetch before React boots
            so data arrives in parallel with JS bundle parsing.
            The store reads window.__dira_prefetch instead of making a fresh call. */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            window.__dira_prefetch = fetch('/api/prefetch', { credentials: 'include' })
              .then(function(r) { return r.ok ? r.json() : null; })
              .catch(function() { return null; });
          } catch(e) {}
        `}} />

        {/* Script 3: service worker registration */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                reg.addEventListener('updatefound', function() {
                  var w = reg.installing;
                  if (w) w.addEventListener('statechange', function() {
                    if (w.state === 'installed' && navigator.serviceWorker.controller) {
                      w.postMessage({ type: 'SKIP_WAITING' });
                    }
                  });
                });
              });
            });
          }
        `}} />

        {children}
      </body>
    </html>
  )
}
