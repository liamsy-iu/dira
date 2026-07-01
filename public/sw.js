const CACHE_NAME = 'dira-v1'

// Pages to cache on install
const PRECACHE = ['/offline', '/login']

// Install — precache critical pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

// Activate — remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch — network first, fall back to cache, then offline page
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests and browser-extension requests
  if (request.method !== 'GET') return
  if (!request.url.startsWith('http')) return

  // Skip Supabase API calls — these must be live
  if (request.url.includes('supabase.co')) return

  // Skip Next.js server actions and API routes
  if (request.url.includes('/api/')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful page navigations
        if (request.mode === 'navigate' && response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() =>
        // Network failed — try cache
        caches.match(request).then(
          (cached) =>
            cached ??
            // No cache — show offline page for navigations
            (request.mode === 'navigate'
              ? caches.match('/offline')
              : new Response('Offline', { status: 503 }))
        )
      )
  )
})
