/*
 * Service worker de BA Transit: deja el sitio instalable, le da un
 * minimo funcionamiento sin conexion y muestra los avisos (Web Push).
 *
 * - Paginas: siempre la red; sin conexion, offline.html (el sitio sin
 *   datos en vivo no sirve, mejor decirlo claro).
 * - Archivos del sitio (JS, CSS, iconos, fuentes): se sirven de la cache
 *   y se actualizan en segundo plano.
 * - Los datos (API, mapas, clima) siempre van a la red: nunca se muestran
 *   datos viejos como si fueran actuales.
 */
const VERSION = 'ba-transit-v2'
const SHELL = ['/offline.html', '/favicon.svg', '/icon-192.png', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Solo archivos del propio sitio; API, mosaicos del mapa y clima pasan directo.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(VERSION).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)
      return cached ?? network
    }),
  )
})

// ---- Avisos ----
// El servidor manda { title, body, icon, url, tag, action, resolved } (ver WebPushSender).
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'BA Transit', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'BA Transit'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: '/notif/badge.png',
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || '/' },
      actions: data.action ? [{ action: 'abrir', title: data.action }] : [],
    }),
  )
})

// Al tocar el aviso (o su boton): si el sitio ya esta abierto, se usa esa pestaña.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin)
  if (target.origin !== self.location.origin) return
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === target.origin)
      if (open) return open.navigate(target.href).then((w) => (w ?? open).focus())
      return self.clients.openWindow(target.href)
    }),
  )
})
