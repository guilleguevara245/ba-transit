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

/** Los modelos que mas vuelan en Aeroparque y Ezeiza (codigo OACI -> nombre). */
const AIRCRAFT = {
  A319: 'Airbus A319',
  A320: 'Airbus A320',
  A20N: 'Airbus A320neo',
  A321: 'Airbus A321',
  A21N: 'Airbus A321neo',
  A332: 'Airbus A330-200',
  A333: 'Airbus A330-300',
  A339: 'Airbus A330-900',
  A359: 'Airbus A350-900',
  A388: 'Airbus A380',
  B737: 'Boeing 737-700',
  B738: 'Boeing 737-800',
  B38M: 'Boeing 737 MAX 8',
  B739: 'Boeing 737-900',
  B763: 'Boeing 767-300',
  B772: 'Boeing 777-200',
  B77W: 'Boeing 777-300ER',
  B788: 'Boeing 787-8',
  B789: 'Boeing 787-9',
  B78X: 'Boeing 787-10',
  E190: 'Embraer 190',
  E195: 'Embraer 195',
  E290: 'Embraer 190-E2',
  E295: 'Embraer 195-E2',
  AT72: 'ATR 72',
  AT76: 'ATR 72-600',
  CRJ2: 'Bombardier CRJ200',
  CRJ9: 'Bombardier CRJ900',
  C208: 'Cessna Caravan',
  B350: 'Beechcraft King Air 350',
  LJ45: 'Learjet 45',
}

/** "B738" -> "Boeing 737-800"; si no se conoce, el codigo tal cual. */
export function aircraftName(code) {
  if (!code) return null
  return AIRCRAFT[code.toUpperCase()] ?? code
}

/** "LV-GKO · Boeing 737-800": matricula y modelo, si se conocen. */
export function flightDetail(flight) {
  return (
    [flight.registration !== flight.callsign ? flight.registration : null, aircraftName(flight.aircraftType)]
      .filter(Boolean)
      .join(' · ') || null
  )
}

const DIRECTIONS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste']

/** Rumbo en grados -> "noroeste" (de 8 direcciones). */
export function headingName(degrees) {
  if (degrees == null || !Number.isFinite(degrees)) return null
  return DIRECTIONS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8]
}

/** Aterrizando y despegando ahora en un aeropuerto (para su tarjeta). */
export function airportTraffic(flights, code) {
  const here = (flights ?? []).filter((f) => f.airport === code)
  return {
    arriving: here.filter((f) => f.phase === 'LANDING').length,
    departing: here.filter((f) => f.phase === 'DEPARTING').length,
  }
}

/** Los que estan llegando o saliendo, para la lista debajo del mapa. */
export function movingNow(flights) {
  return flights.filter((f) => f.phase === 'LANDING' || f.phase === 'DEPARTING')
}

