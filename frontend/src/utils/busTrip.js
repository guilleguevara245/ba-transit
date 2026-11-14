/**
 * Los tiempos de la lista de paradas de un colectivo. Sin nada elegido,
 * desde la cabecera. Con una parada elegida (from, donde subis), desde ahi:
 * las de antes quedan sin tiempo. Con la parada donde bajas (to), ademas el
 * viaje entre las dos (si no se eligio donde subis, desde la cabecera).
 *
 * minutes: los del feed para cada parada, desde la cabecera (null si
 * faltan). Devuelve { rows, trip }: rows[i] = { state, minutes } con state
 * 'normal', 'before' (antes de subir), 'from', 'ride' (en el viaje), 'to' o
 * 'after' (despues de bajar), y minutes los que se muestran (o null);
 * trip = { from, to, stops, minutes } o null.
 */
export function stopTimes(minutes = [], count = minutes.length, from = null, to = null) {
  const at = (i) => (minutes[i] == null ? null : minutes[i])
  const origin = from ?? (to != null ? 0 : null)
  if (origin == null) {
    return { rows: Array.from({ length: count }, (_, i) => ({ state: 'normal', minutes: i > 0 ? at(i) : null })), trip: null }
  }
  const base = at(origin) ?? (origin === 0 ? 0 : null)
  const since = (i) => (base == null || at(i) == null ? null : Math.max(0, at(i) - base))
  const rows = Array.from({ length: count }, (_, i) => {
    if (i < origin) return { state: 'before', minutes: null }
    if (i === origin) return { state: 'from', minutes: null }
    if (to == null) return { state: 'normal', minutes: since(i) }
    if (i < to) return { state: 'ride', minutes: since(i) }
    if (i === to) return { state: 'to', minutes: since(i) }
    return { state: 'after', minutes: null }
  })
  const trip = to != null && to > origin ? { from: origin, to, stops: to - origin, minutes: since(to) } : null
  return { rows, trip }
}
