import { MODE_LABELS } from '../constants.js'

export const JURISDICTION_LABELS = {
  NACIONAL: 'Nacionales',
  CABA: 'Ciudad (CABA)',
  PROVINCIA: 'Provincia',
}

const JURISDICTION_ORDER = ['NACIONAL', 'CABA', 'PROVINCIA']
const MODE_ORDER = ['COLECTIVO', 'SUBTE', 'PREMETRO', 'TREN']

const num = (value) => (value == null ? null : Number(value))

/**
 * Texto corto del tramo de una tarifa, sin el modo: "0-3 km",
 * "Sección 1 · 0-12 km", "21 a 30 viajes", "Tarifa única".
 */
export function tierLabel(fare) {
  const tripsFrom = num(fare.tripsFrom)
  const tripsTo = num(fare.tripsTo)
  if (tripsFrom != null) {
    return tripsTo == null ? `${tripsFrom} viajes o más` : `${tripsFrom} a ${tripsTo} viajes`
  }

  const minKm = num(fare.minKm)
  const maxKm = num(fare.maxKm)
  let km = null
  if (minKm != null && maxKm == null) km = `más de ${minKm} km`
  else if (minKm != null) km = `${minKm}-${maxKm} km`

  if (fare.section != null) return km ? `Sección ${fare.section} · ${km}` : `Sección ${fare.section}`
  return km ?? 'Tarifa única'
}

/**
 * Texto completo de una tarifa (ver Fare en el backend): modo,
 * jurisdiccion del colectivo si la hay, y tramo.
 */
export function fareLabel(fare) {
  const modeLabel = MODE_LABELS[fare.mode] ?? fare.mode
  const jurisdiction = fare.jurisdiction ? ` ${JURISDICTION_LABELS[fare.jurisdiction] ?? fare.jurisdiction}` : ''
  const tier = tierLabel(fare)
  if (tier === 'Tarifa única') return `${modeLabel}${jurisdiction}, tarifa plana`
  return `${modeLabel}${jurisdiction}, ${tier}`
}

function sortTiers(a, b) {
  return (
    (num(a.tripsFrom) ?? 0) - (num(b.tripsFrom) ?? 0) ||
    (num(a.section) ?? 0) - (num(b.section) ?? 0) ||
    (num(a.minKm) ?? 0) - (num(b.minKm) ?? 0)
  )
}

/**
 * Agrupa las tarifas para mostrarlas como cuadro: un grupo por modo,
 * y los colectivos ademas por jurisdiccion. Cada grupo trae sus filas
 * ordenadas por tramo.
 */
export function groupFares(fares) {
  const groups = new Map()
  for (const fare of fares ?? []) {
    const key = fare.mode === 'COLECTIVO' ? `COLECTIVO:${fare.jurisdiction ?? 'NACIONAL'}` : fare.mode
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        mode: fare.mode,
        jurisdiction: fare.mode === 'COLECTIVO' ? (fare.jurisdiction ?? 'NACIONAL') : null,
        rows: [],
      })
    }
    groups.get(key).rows.push(fare)
  }

  const rank = (group) =>
    MODE_ORDER.indexOf(group.mode) * 10 + (group.jurisdiction ? JURISDICTION_ORDER.indexOf(group.jurisdiction) : 0)

  return [...groups.values()]
    .map((group) => ({ ...group, rows: [...group.rows].sort(sortTiers) }))
    .sort((a, b) => rank(a) - rank(b))
}

/**
 * Tarifa base de cada modo, la que paga alguien que viaja poco con la
 * SUBE registrada: subte de 1 a 20 viajes, tren seccion 1, colectivo
 * nacional del primer tramo. Sin datos de jurisdiccion o viajes, toma
 * el primer tramo cargado.
 */
export function basePrices(fares) {
  const prices = {}
  // groupFares ya ordena nacionales primero y cada grupo por tramo.
  for (const group of groupFares(fares)) {
    if (prices[group.mode] == null) prices[group.mode] = Number(group.rows[0].price)
  }
  return prices
}

/**
 * Resumen para el panel de inicio: una fila por modo con el precio
 * base y si hay varios tramos ("desde").
 */
export function fareSummary(fares) {
  const base = basePrices(fares)
  const lowest = {}
  const count = {}
  for (const fare of fares ?? []) {
    const price = Number(fare.price)
    lowest[fare.mode] = lowest[fare.mode] == null ? price : Math.min(lowest[fare.mode], price)
    count[fare.mode] = (count[fare.mode] ?? 0) + 1
  }

  const hint = {
    COLECTIVO: 'según distancia y jurisdicción',
    SUBTE: 'baja con más viajes en el mes',
    TREN: 'según sección',
    PREMETRO: 'tarifa única',
  }

  return MODE_ORDER.filter((mode) => base[mode] != null).map((mode) => ({
    mode,
    label: MODE_LABELS[mode] ?? mode,
    price: mode === 'SUBTE' ? base[mode] : lowest[mode],
    from: count[mode] > 1 && mode !== 'SUBTE',
    hint: count[mode] > 1 ? hint[mode] : null,
  }))
}
