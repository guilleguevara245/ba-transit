/**
 * Aviones en vivo (OpenSky Network, via /api/v1/vuelos): textos y grupos
 * para el mapa de Aeropuertos.
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

/** Titulo del avion: el indicativo (ARG1477) o, si no lo transmite, su codigo de transpondedor. */
export function flightTitle(flight) {
  return flight.callsign ?? `Avión ${flight.id.toUpperCase()}`
}

/** Los que estan llegando o saliendo, para la lista debajo del mapa. */
export function movingNow(flights) {
  return flights.filter((f) => f.phase === 'LANDING' || f.phase === 'DEPARTING')
}

/*
 * Respaldo desde el navegador: OpenSky a veces no le responde al servidor
 * (tarda demasiado con los servidores en la nube). Entonces el navegador
 * pide los aviones directo, sin cuenta, y los clasifica igual que el
 * backend (FlightService.java): mismos aeropuertos, radios y umbrales.
 */

export const OPENSKY_URL =
  'https://opensky-network.org/api/states/all?lamin=-35.3&lomin=-59.3&lamax=-34.0&lomax=-57.9'

const AIRPORTS = [
  { code: 'AEP', latitude: -34.5592, longitude: -58.4156 },
  { code: 'EZE', latitude: -34.8222, longitude: -58.5358 },
]

const AIRLINES = {
  ARG: 'Aerolíneas Argentinas', AUT: 'Aerolíneas Argentinas', JES: 'JetSMART', JAT: 'JetSMART',
  FBZ: 'Flybondi', LAN: 'LATAM', LPE: 'LATAM', TAM: 'LATAM', LXP: 'LATAM', LNE: 'LATAM', GLO: 'GOL',
  AZU: 'Azul', ANS: 'Andes Líneas Aéreas', LDE: 'LADE', AAL: 'American Airlines', DAL: 'Delta',
  UAL: 'United', IBE: 'Iberia', AEA: 'Air Europa', AFR: 'Air France', KLM: 'KLM', DLH: 'Lufthansa',
  BAW: 'British Airways', ITY: 'ITA Airways', UAE: 'Emirates', ETH: 'Ethiopian', THY: 'Turkish Airlines',
  CMP: 'Copa', AVA: 'Avianca', ARE: 'Avianca', BOV: 'BoA', SKU: 'SKY Airline', AMX: 'Aeroméxico',
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function classifyFlight(lat, lon, onGround, altitude, verticalRate) {
  let nearest = null
  let nearestKm = Infinity
  for (const a of AIRPORTS) {
    const km = distanceKm(lat, lon, a.latitude, a.longitude)
    if (km < nearestKm) {
      nearest = a
      nearestKm = km
    }
  }
  if (onGround) return { phase: 'GROUND', airport: nearestKm <= 4 ? nearest.code : null }
  if (altitude != null && altitude < 2500 && nearestKm <= 35) {
    if (verticalRate != null && verticalRate <= -1) return { phase: 'LANDING', airport: nearest.code }
    if (verticalRate != null && verticalRate >= 1) return { phase: 'DEPARTING', airport: nearest.code }
    return { phase: 'NEAR', airport: nearest.code }
  }
  return { phase: 'CRUISE', airport: null }
}

export function airlineFor(callsign) {
  if (!callsign || !/^[A-Z]{3}\d/i.test(callsign)) return null
  return AIRLINES[callsign.slice(0, 3).toUpperCase()] ?? null
}

const PHASE_ORDER = ['LANDING', 'DEPARTING', 'GROUND', 'NEAR', 'CRUISE']
const num = (v) => (typeof v === 'number' ? v : null)

/** Respuesta de /states/all -> la lista de aviones con el formato del backend. */
export function parseOpenSky(body) {
  const time = body?.time ?? 0
  const flights = []
  for (const s of body?.states ?? []) {
    if (!Array.isArray(s) || s[5] == null || s[6] == null) continue
    const onGround = s[8] === true
    const maxAge = onGround ? 900 : 120
    if (time > 0 && (s[3] == null || time - s[3] > maxAge)) continue
    const callsign = (s[1] ?? '').trim() || null
    const altitude = num(s[13]) ?? num(s[7])
    const velocity = num(s[9])
    const { phase, airport } = classifyFlight(s[6], s[5], onGround, altitude, num(s[11]))
    flights.push({
      id: s[0],
      callsign,
      airline: airlineFor(callsign),
      country: s[2] ?? null,
      latitude: s[6],
      longitude: s[5],
      altitude: onGround || altitude == null ? null : Math.round(altitude),
      onGround,
      speed: velocity == null ? null : Math.round(velocity * 3.6),
      heading: num(s[10]),
      verticalRate: num(s[11]),
      phase,
      airport,
    })
  }
  flights.sort(
    (a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase) || (a.callsign ?? '~').localeCompare(b.callsign ?? '~'),
  )
  return flights
}
