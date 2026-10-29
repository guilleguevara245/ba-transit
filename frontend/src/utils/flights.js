/**
 * Aviones en vivo (adsb.lol, via /api/v1/vuelos): textos y grupos para el
 * mapa de Aeropuertos.
 */

export const AIRPORT_NAMES = { AEP: 'Aeroparque', EZE: 'Ezeiza' }

/** Grupos de la referencia del mapa, en orden. "Cerca" y "de paso" van juntos como "En vuelo". */
export const FLIGHT_GROUPS = [
  { key: 'arriving', label: 'Llegando', color: '#2f8a3c' },
  { key: 'departing', label: 'Saliendo', color: '#f4c11b' },
  { key: 'ground', label: 'En tierra', color: '#8f8c83' },
  { key: 'air', label: 'En vuelo', color: '#17171a' },
]

export function flightGroup(flight) {
  if (flight.phase === 'LANDING') return 'arriving'
  if (flight.phase === 'DEPARTING') return 'departing'
  if (flight.phase === 'GROUND') return 'ground'
  return 'air'
}

/** "Aterrizando en Aeroparque", "Despegó de Ezeiza", "En tierra en Aeroparque"... */
export function flightStatus(flight) {
  const airport = AIRPORT_NAMES[flight.airport]
  switch (flight.phase) {
    case 'LANDING':
      return airport ? `Aterrizando en ${airport}` : 'Aterrizando'
    case 'DEPARTING':
      return airport ? `Despegó de ${airport}` : 'Despegando'
    case 'GROUND':
      return airport ? `En tierra en ${airport}` : 'En tierra'
    case 'NEAR':
      return airport ? `Cerca de ${airport}` : 'En vuelo'
    default:
      return 'En vuelo'
  }
}

const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

/** Altitud en metros, redondeada a la decena: "3.050 m". */
export function formatAltitude(meters) {
  if (meters == null) return null
  return `${number.format(Math.round(meters / 10) * 10)} m`
}

export function formatSpeed(kmh) {
  return kmh == null ? null : `${number.format(kmh)} km/h`
}

/** Titulo del avion: el indicativo (ARG1477) o, si no lo transmite, su matricula o codigo de transpondedor. */
export function flightTitle(flight) {
  return flight.callsign ?? flight.registration ?? `Avión ${flight.id.toUpperCase()}`
}

/** "LV-GKO · B738": matricula y modelo, si se conocen. */
export function flightDetail(flight) {
  return [flight.registration !== flight.callsign ? flight.registration : null, flight.aircraftType].filter(Boolean).join(' · ') || null
}

/** Los que estan llegando o saliendo, para la lista debajo del mapa. */
export function movingNow(flights) {
  return flights.filter((f) => f.phase === 'LANDING' || f.phase === 'DEPARTING')
}

