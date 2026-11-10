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

/**
 * Un color del tema escrito como variable ("var(--traffic-closed)", que es
 * negro en el tema claro y casi blanco en el oscuro) pasado al valor que
 * tiene ahora, para poder calcular el texto que va encima. Cualquier otro
 * color vuelve igual.
 */
export function resolveThemeColor(color) {
  const name = /^var\((--[\w-]+)\)$/.exec(color ?? '')?.[1]
  if (!name || typeof document === 'undefined') return color
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim() || color
}

/**
 * Encabezado pintado de las tarjetas de los mapas (como el cartel del
 * anden): las clases y las variables con el color y el texto que
 * se lee encima. Sin color, la tarjeta queda como siempre.
 */
export function cardHeader(color) {
  if (!color) return { className: '', style: undefined }
  const ink = readableTextColor(color)
  return {
    className: ink === '#ffffff' ? ' has-header header-light-ink' : ' has-header',
    style: { '--card-color': color, '--card-ink': ink },
  }
}
