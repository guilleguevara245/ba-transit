/*
 * Service worker de BA Transit: deja el sitio instalable y le da un
 * minimo funcionamiento sin conexion.
 *
 * - Paginas: siempre la red; sin conexion, offline.html (el sitio sin
 *   datos en vivo no sirve, mejor decirlo claro).
 * - Archivos del sitio (JS, CSS, iconos, fuentes): se sirven de la cache
 *   y se actualizan en segundo plano.
 * - Los datos (API, mapas, clima) siempre van a la red: nunca se muestran
 *   datos viejos como si fueran actuales.
 */
const VERSION = 'ba-transit-v1'
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
