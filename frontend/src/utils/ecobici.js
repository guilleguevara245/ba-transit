/** Minusculas y sin tildes, para buscar "plaza italia" o "Plaza Itália" igual. */
export function normalizeText(text) {
  return (text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** "002 - Retiro I" -> "Retiro I" (el numero no le dice nada al usuario). */
export function stationLabel(name) {
  return (name ?? '').replace(/^\s*\d+\s*[-–]\s*/, '').trim() || name
}

/** Nivel de disponibilidad de bicis para colorear el mapa. */
export function availability(station) {
  if (!station.renting) return { key: 'off', label: 'Fuera de servicio', color: '#a3a097' }
  if (station.bikes === 0) return { key: 'empty', label: 'Sin bicis', color: '#c23b34' }
  if (station.bikes <= 3) return { key: 'low', label: 'Pocas bicis', color: '#d08a0a' }
  return { key: 'ok', label: 'Con bicis', color: '#2f8a3c' }
}
