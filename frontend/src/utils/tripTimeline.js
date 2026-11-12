import { distanceText } from './addressSearch.js'
import { WAIT_MINUTES, isAddress } from './planner.js'
import { formatDuration } from './travelTime.js'

const minutesBetween = (a, b) => (new Date(b).getTime() - new Date(a).getTime()) / 60_000
const duration = (minutes) => formatDuration(Math.max(0, Math.round(minutes)))

/** El primer tren que corre y sale cuando ya se esta en el anden (readyAt: minutos desde start). */
function pickTrain(trips, start, readyAt) {
  return (trips ?? []).find((t) => !t.cancelled && minutesBetween(start, t.departure) >= readyAt - 0.5) ?? null
}

/**
 * Los tramos con los trenes reales donde los hay (trains: { indice del
 * tramo: proximos trenes de /api/v1/trenes/viaje }). Cada tramo en tren
 * con un tren que se alcanza toma su salida y su llegada; el tramo de
 * antes (a pie o cambio de ramal) cambia la espera promedio por la
 * espera real hasta ese tren. offset: si el viaje empieza en un tren,
 * los minutos hasta que sale.
 */
export function withTrains(legs, trains, start) {
  if (!start || !trains || !legs?.length) return { legs: legs ?? [], offset: 0 }
  const out = legs.map((leg) => ({ ...leg }))
  let offset = 0
  if (out[0].type === 'ride') {
    const train = pickTrain(trains[0], start, 0)
    if (train) {
      out[0].train = train
      offset = Math.max(0, minutesBetween(start, train.departure))
    }
  }
  let at = offset
  out.forEach((leg, i) => {
    if (leg.train) leg.minutes = minutesBetween(leg.train.departure, leg.train.arrival)
    const next = out[i + 1]
    if (next?.type === 'ride') {
      const own = Math.max(0, leg.minutes - (leg.type === 'walk' || leg.type === 'branch' ? WAIT_MINUTES : 0))
      const train = pickTrain(trains[i + 1], start, at + own)
      if (train) {
        next.train = train
        leg.wait = Math.max(0, minutesBetween(start, train.departure) - at - own)
        leg.minutes = own + leg.wait
      }
    }
    at += leg.minutes
  })
  return { legs: out, offset }
}

/**
 * Como se nombra el tren a tomar: "Tren de las 15:32 a Victoria · andén 2
 * · Rápido · según horario" (el destino, si no es el del sentido). clock:
 * da formato a la hora, como el resto del viaje.
 */
export function trainText(train, towards, clock) {
  const to = train.destination && train.destination !== towards ? ` a ${train.destination}` : ''
  const parts = [`Tren de las ${clock(new Date(train.departure))}${to}`]
  if (train.platform) parts.push(`andén ${train.platform}`)
  if (train.service) parts.push(train.service)
  parts.push(train.scheduled ? 'según horario' : 'en vivo')
  return parts.join(' · ')
}

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
  const time = duration(leg.minutes)
  const stops = `${leg.stops} ${leg.stops === 1 ? 'estación' : 'estaciones'}`
  // Con un tren real, el viaje dura lo que dice su horario.
  if (leg.type === 'ride') return leg.train ? `${stops} · ${time}` : `${stops} · ≈ ${time}`
  if (leg.type === 'walk') return `Caminá unos ${leg.meters} m hasta ${leg.to.stationName} · ≈ ${time} con la espera`
  if (leg.type === 'branch') return `Esperá el tren del otro ramal · ≈ ${time}`
  if (leg.type === 'access') {
    const walk = `Caminá unos ${distance(leg.km)} hasta ${leg.to.stationName}`
    if (leg.wait >= 1) return `${walk} · ≈ ${duration(leg.minutes - leg.wait)} y ${duration(leg.wait)} de espera`
    return `${walk} · ≈ ${time}`
  }
  return `Caminá unos ${distance(leg.km)} · ≈ ${time}`
}

/**
 * El viaje como linea de tiempo: paradas (donde se sale, se sube, se
 * combina o se llega) y, entre ellas, los tramos a bordo o a pie. Cada
 * parada lleva los minutos desde la salida (at) y como llega y sigue la
 * linea (in/out: color de la linea, 'walk' o 'wait'). Con trains y start
 * (ver withTrains), donde se sube a un tren de Trenes Argentinos la parada
 * lleva ese tren (train) y los tiempos siguen su horario.
 */
export function tripTimeline(legs, { trains, start } = {}) {
  if (!legs?.length) return []
  const timed = withTrains(legs, trains, start)
  legs = timed.legs
  const items = []
  let at = timed.offset
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
      train: leg.type === 'ride' ? (leg.train ?? null) : null,
      towards: leg.type === 'ride' ? leg.towards.stationName : null,
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
