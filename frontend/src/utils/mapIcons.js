import { divIcon } from 'leaflet'

/**
 * Iconos de los mapas: un distintivo (circulo o cuadro redondeado) con un
 * dibujo de trazo adentro, del mismo estilo que los iconos de la barra de
 * navegacion (24x24, linea redondeada).
 */
export const GLYPHS = {
  bus: 'M6 3h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM4 11h16M8 21v-3m8 3v-3M7.5 14.5h.01m9 0h.01',
  bike: 'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5 9 8h6l3.5 6.5M9 8l3 6.5h-1M14 5h2.5',
  // Avion visto desde arriba (se dibuja relleno: ver FILLED).
  plane: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z',
  // Garaje: casa con porton.
  garage: 'M3 11 12 4l9 7v9H3zM7.5 20v-6.5h9V20M7.5 17h9',
  // Playa de estacionamiento: un auto de frente entre las lineas de un lugar.
  lot: 'M5.5 11.5 7 7.5h10l1.5 4M4.5 11.5h15v5h-15zM7 16.5v2M17 16.5v2M7.5 14h.01M16.5 14h.01M2 6v14M22 6v14',
  // Moto en la calle.
  moto: 'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5h5l3-5.5h3l2.5 5.5M13.5 6h3.5',
  // Moto guardada: moto bajo un techo.
  motoGarage: 'M2 9 12 3l10 6M6.5 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm11 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6.5 17h3.5l2.5-4.5h2.5l2.5 4.5',
}

/** Dibujos que van rellenos en vez de con trazo. */
export const FILLED = new Set(['plane'])

/** HTML del distintivo, para usarlo tambien fuera del mapa (referencias). */
export function badgeHtml(glyph, { bg, fg, border = 'transparent', shape = 'circle' }) {
  return (
    `<span class="map-badge map-badge-${shape}${FILLED.has(glyph) ? ' map-badge-filled' : ''}" style="background:${bg};color:${fg};border-color:${border}">` +
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${GLYPHS[glyph]}"/></svg></span>`
  )
}

const cache = new Map()

/** divIcon de Leaflet con el distintivo; se guardan para no recrearlos en cada render. */
export function badgeIcon(glyph, options) {
  const { size = 24, active = false } = options
  const key = JSON.stringify([glyph, options])
  if (!cache.has(key)) {
    const px = active ? Math.round(size * 1.3) : size
    cache.set(
      key,
      divIcon({
        className: `map-badge-icon${active ? ' active' : ''}`,
        html: badgeHtml(glyph, options),
        iconSize: [px, px],
        iconAnchor: [px / 2, px / 2],
        popupAnchor: [0, -px / 2],
        tooltipAnchor: [px / 2, 0],
      }),
    )
  }
  return cache.get(key)
}
