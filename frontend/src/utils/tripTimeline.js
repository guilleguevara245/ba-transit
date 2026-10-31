import { distanceText } from './addressSearch.js'
import { isAddress } from './planner.js'
import { formatDuration } from './travelTime.js'

/** Como se dibuja el tramo en la linea de tiempo: el color de la linea, o punteado a pie o esperando. */
function trackOf(leg) {
  if (!leg) return null
  if (leg.type === 'ride') return leg.from.lineColorHex
  return leg.type === 'branch' ? 'wait' : 'walk'
}

const nameOf = (point) => (isAddress(point) ? point.text : point.stationName)
const colorOf = (point) => (isAddress(point) ? null : point.lineColorHex)
const distance = (km) => distanceText(km).replace(/^a /, '')

/** Que se hace en una parada, segun el tramo que sigue. */
function stopText(leg, first) {
  if (leg.type === 'ride') return `Tomá la ${leg.from.lineName} hacia ${leg.towards.stationName}`
  if (leg.type === 'walk') return `${first ? 'Combiná' : 'Bajá y combiná'} con la ${leg.to.lineName}`
  if (leg.type === 'branch') return first ? 'Cambiá de ramal' : 'Bajá y cambiá de ramal'
  if (leg.type === 'egress') return 'Bajá y seguí a pie'
  // Salida desde una direccion: debajo va la localidad.
  return leg.from.area || null
}

/** El texto de un tramo, entre dos paradas. */
function segmentText(leg) {
  const time = formatDuration(leg.minutes)
  if (leg.type === 'ride') return `${leg.stops} ${leg.stops === 1 ? 'estación' : 'estaciones'} · ≈ ${time}`
  if (leg.type === 'walk') return `Caminá unos ${leg.meters} m hasta ${leg.to.stationName} · ≈ ${time} con la espera`
  if (leg.type === 'branch') return `Esperá el tren del otro ramal · ≈ ${time}`
  if (leg.type === 'access') return `Caminá unos ${distance(leg.km)} hasta ${leg.to.stationName} · ≈ ${time}`
  return `Caminá unos ${distance(leg.km)} · ≈ ${time}`
}

/**
 * El viaje como linea de tiempo: paradas (donde se sale, se sube, se
 * combina o se llega) y, entre ellas, los tramos a bordo o a pie. Cada
 * parada lleva los minutos desde la salida (at) y como llega y sigue la
 * linea (in/out: color de la linea, 'walk' o 'wait').
 */
export function tripTimeline(legs) {
  if (!legs?.length) return []
  const items = []
  let at = 0
  legs.forEach((leg, i) => {
    items.push({
      type: 'stop',
      kind: i === 0 ? 'start' : 'stop',
      address: isAddress(leg.from),
      name: nameOf(leg.from),
      color: colorOf(leg.from),
      text: stopText(leg, i === 0),
      at,
      in: trackOf(legs[i - 1]),
      out: trackOf(leg),
    })
    items.push({
      type: 'segment',
      leg: leg.type,
      track: trackOf(leg),
      line: leg.type === 'ride' ? leg.from : null,
      text: segmentText(leg),
    })
    at += leg.minutes
  })
  const last = legs[legs.length - 1]
  items.push({
    type: 'stop',
    kind: 'end',
    address: isAddress(last.to),
    name: nameOf(last.to),
    color: colorOf(last.to),
    text: 'Llegaste',
    at,
    in: trackOf(last),
    out: null,
  })
  return items
}

/**
 * La tira de arriba del resultado: a pie al principio o al final y cada
 * linea en orden (un cambio de ramal no repite la linea).
 */
export function tripStrip(legs) {
  const parts = []
  for (const leg of legs ?? []) {
    if (leg.type === 'access' || leg.type === 'egress') parts.push({ kind: 'walk' })
    if (leg.type !== 'ride') continue
    const prev = parts[parts.length - 1]
    if (prev?.kind === 'line' && prev.station.lineName === leg.from.lineName) continue
    parts.push({ kind: 'line', station: leg.from })
  }
  return parts
}
