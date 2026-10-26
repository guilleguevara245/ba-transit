import { distanceKm } from './map.js'

/** Capas del mapa de estacionamiento, en el orden de los filtros. */
export const PARKING_LAYERS = [
  { key: 'car', label: 'Garajes' },
  { key: 'lot', label: 'Playas de la Ciudad' },
  { key: 'garage', label: 'Cocheras para motos' },
  { key: 'street', label: 'Motos en la calle' },
  { key: 'osm', label: 'Conurbano' },
]

const OSM_KIND = { s: 'Playa subterránea', p: 'Playa de varios pisos', g: 'Garaje', a: 'Playa a cielo abierto' }

/** Menos que esto en un partido: la cobertura de OpenStreetMap ahi es pobre. */
export const LOW_COVERAGE = 5

/** Une los datasets en una sola lista con la capa de cada lugar. */
export function parkingPlaces({ cars = [], lots = [], garages = [], street = [], osm = [], partidos = [] }) {
  return [
    // Garajes comerciales: [lat, lon, direccion, pisos, nombre, barrio].
    ...cars.map(([lat, lon, address, floors, name, barrio], i) => ({
      id: `ga${i}`,
      lat,
      lon,
      address,
      floors,
      name,
      barrio,
      layer: 'car',
      title: name ? `${name} · ${address}` : address,
    })),
    ...lots.map((l) => ({ ...l, layer: 'lot', title: l.name })),
    ...garages.map((g) => ({ ...g, layer: 'garage', title: g.address })),
    ...street.map((s) => ({ ...s, layer: 'street', title: s.street })),
    // Conurbano (OpenStreetMap): [lat, lon, nombre, tipo, cobra, partido].
    ...osm.map(([lat, lon, name, kind, fee, partido], i) => ({
      id: `os${i}`,
      lat,
      lon,
      name,
      kind,
      fee,
      partido: partidos[partido] ?? '',
      layer: 'osm',
      title: name || OSM_KIND[kind] || 'Estacionamiento',
    })),
  ]
}

/** Los `limit` lugares mas cercanos al punto, con la distancia en metros. */
export function nearestPlaces(places, point, limit = 6) {
  if (!point) return []
  return places
    .map((p) => ({ ...p, meters: Math.round(distanceKm(point, { latitude: p.lat, longitude: p.lon }) * 1000) }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit)
}

/** "a 80 m", "a 1,2 km". */
export function formatDistance(meters) {
  if (meters < 1000) return `a ${Math.max(10, Math.round(meters / 10) * 10)} m`
  return `a ${(meters / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`
}

/** Detalle corto de un lugar para la lista y la tarjeta del mapa. */
export function placeDetail(place) {
  if (place.layer === 'osm') {
    const kind = place.name ? OSM_KIND[place.kind] : null
    const fee = place.fee === 1 ? 'pago' : place.fee === 0 ? 'gratis' : null
    return [kind, fee, place.partido].filter(Boolean).join(' · ')
  }
  if (place.layer === 'car') {
    const floors = place.floors > 1 ? `${place.floors} pisos` : null
    return ['Garaje', floors, place.barrio].filter(Boolean).join(' · ')
  }
  if (place.layer === 'lot') {
    const kind = place.underground ? 'Playa subterránea' : 'Playa de estacionamiento'
    return place.address && place.address !== place.name ? `${kind} · ${place.address}` : kind
  }
  if (place.layer === 'garage') {
    const parts = [`${place.capacity} lugares`, place.covered ? 'bajo techo' : 'a cielo abierto']
    if (place.exclusive) parts.push('solo motos')
    return parts.join(' · ')
  }
  const between = place.between?.filter(Boolean)
  const where = place.where === 'Vereda' ? 'sobre la vereda' : 'sobre la calzada'
  return between?.length === 2 ? `Entre ${between[0]} y ${between[1]} · ${where}` : where
}

/** Totales para el resumen de arriba. */
export function parkingTotals(places) {
  const garages = places.filter((p) => p.layer === 'garage')
  return {
    cars: places.filter((p) => p.layer === 'car').length,
    lots: places.filter((p) => p.layer === 'lot').length,
    osm: places.filter((p) => p.layer === 'osm').length,
    garages: garages.length,
    garageSpots: garages.reduce((sum, g) => sum + (g.capacity ?? 0), 0),
    streetBlocks: places.filter((p) => p.layer === 'street').length,
  }
}

/**
 * Cuantos lugares hay en cada partido del conurbano, de mayor a menor;
 * los que no tienen ninguno van al final con 0.
 */
export function coverageByPartido(places, partidos) {
  const counts = new Map(partidos.map((p) => [p, 0]))
  for (const place of places) {
    if (place.layer === 'osm' && counts.has(place.partido)) counts.set(place.partido, counts.get(place.partido) + 1)
  }
  return [...counts.entries()]
    .map(([partido, count]) => ({ partido, count }))
    .sort((a, b) => b.count - a.count || a.partido.localeCompare(b.partido, 'es'))
}
