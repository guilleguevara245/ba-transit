const MAX_OPTIONS = 12

/** Minusculas y sin tildes, para comparar ("constitucion" encuentra "Constitución"). */
export const normalizeText = (text) =>
  (text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()

/**
 * Estaciones que coinciden con el texto (sin tildes): primero las que empiezan con
 * el texto, despues las que lo contienen; a igualdad, por nombre.
 */
export function matchStations(stations, query, limit = MAX_OPTIONS) {
  const q = normalizeText(query)
  if (!q) return []
  // Cada palabra tiene que aparecer en el nombre o en la linea ("retiro mitre").
  const words = q.split(/\s+/)
  return stations
    .map((s) => ({ s, name: normalizeText(s.stationName), line: normalizeText(s.lineName) }))
    .filter(({ name, line }) => words.every((w) => name.includes(w) || line.includes(w)))
    .sort((a, b) => Number(!a.name.startsWith(q)) - Number(!b.name.startsWith(q)) || a.name.localeCompare(b.name, 'es'))
    .slice(0, limit)
    .map(({ s }) => s)
}
