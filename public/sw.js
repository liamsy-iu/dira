/**
 * Dira Service Worker
 *
 * Three-tier caching strategy:
 *
 * 1. /_next/static/** — Cache-first, permanent.
 *    Next.js content-hashes these filenames so they never go stale.
 *    On second load, all JS/CSS is served from disk in <10ms.
 *
 * 2. HTML pages (navigate requests) — Network-first, cache fallback.
 *    Always tries to get fresh HTML. Falls back to cached version if offline.
 *
 * 3. Supabase + API routes — Network-only, never cached.
 *    Live data must always come from the network.
 */

const STATIC_CACHE  = 'dira-static-v2'   // JS/CSS chunks — permanent
const PAGE_CACHE    = 'dira-pages-v2'    // HTML shells — network-first
const PRECACHE_URLS = ['/offline']

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ── Activate — delete old cache versions ─────────────────────────────────────
self.addEventListener('activate', (event) => {
  const CURRENT = [STATIC_CACHE, PAGE_CACHE]
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !CURRENT.includes(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // ── Never cache: Supabase, API routes, webpack HMR ───────────────────────
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/')      ||
    url.pathname.includes('_next/webpack-hmr')
  ) return

  // ── Cache-first: Next.js static chunks (JS, CSS, fonts, images) ──────────
  // Content-hashed filenames mean no stale data risk — ever.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached

        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  // ── Network-first: HTML page shells ──────────────────────────────────────
  // Get fresh HTML when online. Serve cached version when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, response.clone()))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached ?? (await caches.match('/offline')) ?? new Response('Offline', { status: 503 })
        })
    )
    return
  }

  // ── Stale-while-revalidate: everything else (images, fonts not in _next) ──
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone())
        return response
      })
      return cached ?? fetchPromise
    })
  )
})
