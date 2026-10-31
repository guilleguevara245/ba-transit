/** Minusculas y sin tildes, para buscar "plaza italia" o "Plaza Itália" igual. */
export function normalizeText(text) {
  return (text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** "002 - Retiro I" -> "Retiro I" (el numero no le dice nada al usuario). */
export function stationLabel(name) {
  return (name ?? '').replace(/^\s*\d+\s*[-–]\s*/, '').trim() || name
}

const LOWER_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'a', 'al', 'en'])
const KEEP_UPPER = /^([ivx]+|uba|utn|uade|uca|itba|malba|macba|ypf)$/

/**
 * Nombre para mostrar: sin el numero y, si el feed lo trae en mayusculas,
 * escrito normal ("GAINZA" -> "Gainza", "RETIRO II" -> "Retiro II").
 */
export function stationName(name) {
  const label = stationLabel(name)
  if (!label || label !== label.toUpperCase()) return label
  return label
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (KEEP_UPPER.test(word)) return word.toUpperCase()
      if (index > 0 && LOWER_WORDS.has(word)) return word
      return word.replace(/^\p{L}/u, (c) => c.toUpperCase())
    })
    .join(' ')
}

/** Desde cuantas bicis (o anclajes libres) se considera que hay de sobra. */
export const PLENTY = 5

/** Nivel de disponibilidad de bicis para colorear el mapa. */
/**
 * Como se dibuja cada estado en el mapa: una bici con el color del estado
 * (verde con bicis, amarillo con pocas, rojo sin bicis, gris fuera de servicio).
 */
export const AVAILABILITY_BADGES = {
  ok: { glyph: 'bike', bg: '#2f8a3c', fg: '#ffffff', border: '#ffffff' },
  low: { glyph: 'bike', bg: '#f4c11b', fg: '#17171a', border: '#17171a' },
  empty: { glyph: 'bike', bg: '#c23b34', fg: '#ffffff', border: '#ffffff' },
  off: { glyph: 'bike', bg: '#a3a097', fg: '#ffffff', border: '#ffffff' },
}

export function availability(station) {
  if (!station.renting) return { key: 'off', label: 'Fuera de servicio', color: '#a3a097' }
  if (station.bikes === 0) return { key: 'empty', label: 'Sin bicis', color: '#c23b34' }
  // Mismo corte que los dibujos de la tarjeta (stockLevel): de 1 a 4 son pocas.
  if (station.bikes < PLENTY) return { key: 'low', label: 'Pocas bicis', color: '#d08a0a' }
  return { key: 'ok', label: 'Con bicis', color: '#2f8a3c' }
}

/**
 * Cuantas quedan, para el icono de la tarjeta: de sobra (verde, tres
 * dibujos), pocas (amarillo, dos), la ultima (rojo, uno, con aviso) o
 * ninguna (rojo, tachado). kind: 'bikes' o 'docks'.
 */
export function stockLevel(count, kind = 'bikes') {
  const bikes = kind === 'bikes'
  if (!Number.isFinite(count) || count <= 0) {
    // Sin bicis ya lo dice el estado de la estacion; sin anclajes no, y es lo que importa para devolverla.
    return { key: 'none', glyphs: 1, note: bikes ? null : 'No hay lugar para dejarla' }
  }
  if (count === 1) return { key: 'last', glyphs: 1, note: bikes ? '¡Apurate, queda una!' : 'Queda un solo lugar' }
  if (count < PLENTY) return { key: 'few', glyphs: 2, note: null }
  return { key: 'plenty', glyphs: 3, note: null }
}

/**
 * Que hay en la estacion segun su nombre, para el icono de la tarjeta:
 * "Plaza Italia" es una plaza, "Facultad de Derecho" una facultad... El
 * orden importa: "Plaza del Congreso" es el Congreso antes que una plaza.
 */
const PLACE_KINDS = [
  ['congreso', /\b(congreso|legislatura|casa rosada|tribunales|palacio)\b/],
  ['universidad', /\b(facultad|universidad|uba|utn|ciudad universitaria|instituto|colegio|escuela)\b/],
  ['hospital', /\b(hospital|sanatorio|clinica)\b/],
  ['iglesia', /\b(iglesia|basilica|catedral|parroquia)\b/],
  ['cultura', /\b(museo|teatro|biblioteca|centro cultural|planetario|malba|macba)\b/],
  ['deporte', /\b(estadio|club|polideportivo|hipodromo|autodromo)\b/],
  ['estacion', /\b(estacion|terminal|retiro|constitucion)\b/],
  ['plaza', /\b(plaza|plazoleta|parque|jardin|reserva|bosques?|rosedal)\b/],
]

export function placeKind(name) {
  const text = normalizeText(stationLabel(name))
  return PLACE_KINDS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'bici'
}
