/**
 * Devuelve el color de texto (oscuro o blanco) que mejor se lee sobre
 * un fondo dado, segun su luminancia. Sirve para los badges de linea:
 * sobre la Linea H (amarilla) el texto blanco no se lee.
 */
export function readableTextColor(hex) {
  const clean = (hex ?? '').replace('#', '')
  if (clean.length !== 6) return '#ffffff'

  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255)
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)

  return luminance > 0.4 ? '#17171a' : '#ffffff'
}
