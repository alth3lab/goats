// ============================================================
// وبر وصوف — Service Worker (PWA)
// Strategy:
//   - Static assets  → Cache First
//   - API /api/*     → Network First (fallback: cached or error JSON)
//   - Pages          → Network First (fallback: offline.html)
// ============================================================

const CACHE_NAME = 'wabr-wsuf-v1'
const OFFLINE_URL = '/offline.html'

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
]

// ── Install: pre-cache essential files ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ── Activate: clean up old caches ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: routing logic ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and non-http requests
  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return
  // Skip Next.js internal routes
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  // ── API routes: Network First ──────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache successful API GET responses briefly
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          }
          return res
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          return new Response(
            JSON.stringify({ error: 'لا يوجد اتصال بالإنترنت', offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
        })
    )
    return
  }

  // ── Static assets (_next/static, fonts, images): Cache First ──
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    /\.(png|jpg|jpeg|gif|svg|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((c) => c.put(request, res.clone()))
          }
          return res
        })
      )
    )
    return
  }

  // ── Navigation (HTML pages): Network First → offline fallback ──
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        return caches.match(OFFLINE_URL)
      })
    )
    return
  }
})

// ── Push notifications ───────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try { payload = event.data.json() } catch { return }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'وبر وصوف', {
      body: payload.body || '',
      icon: '/icon-192.png',
      badge: '/favicon.svg',
      dir: 'rtl',
      lang: 'ar',
      data: { url: payload.url || '/dashboard' },
      actions: payload.actions || [],
      requireInteraction: payload.requireInteraction || false,
    })
  )
})

// ── Notification click: open/focus tab ──────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})
