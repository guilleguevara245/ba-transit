/**
 * Direccion legible de cada linea: /lineas/subte-b, /lineas/premetro,
 * /lineas/san-martin. Sale del modo y el codigo, que no cambian (el id de
 * la base si podria). Sin codigo se usa el id.
 */
export function lineSlug({ mode, code } = {}) {
  if (!code) return null
  if (mode === 'PREMETRO' || code === 'P' || code === 'PREMETRO') return 'premetro'
  if (mode === 'SUBTE') return `subte-${code.toLowerCase()}`
  return code.toLowerCase().replaceAll('_', '-')
}

/** /lineas/<slug>, o /lineas/<id> si la linea no trae modo y codigo. */
export function linePath(line) {
  return `/lineas/${lineSlug(line) ?? line.id}`
}

/** La linea de una direccion: por slug, o por id en los links viejos (/lineas/10). */
export function findLine(lines, ref) {
  if (!lines || !ref) return null
  if (/^\d+$/.test(ref)) return lines.find((l) => String(l.id) === ref) ?? null
  return lines.find((l) => lineSlug(l) === ref) ?? null
}

/** "Plaza de Mayo" -> "plaza-de-mayo"; "J. M. Bosch" -> "j-m-bosch". */
export function textSlug(text) {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Direccion de una estacion: /estaciones/subte-b/medrano. Necesita el modo,
 * el codigo de la linea y el nombre (como en /api/v1/map/stations); si no
 * estan, usa el id.
 */
export function stationPath(station) {
  const line = lineSlug({ mode: station.lineMode, code: station.lineCode })
  const name = textSlug(station.stationName)
  return line && name ? `/estaciones/${line}/${name}` : `/estaciones/${station.stationId}`
}

/**
 * La estacion de una direccion. Con lineRef y stationRef, por los slugs (si
 * el nombre se repite en varios ramales, la primera); con un solo numero,
 * por id (links viejos).
 */
export function findStation(stations, lineRef, stationRef) {
  if (!stations) return null
  if (stationRef == null) return stations.find((s) => String(s.stationId) === String(lineRef)) ?? null
  return (
    stations.find(
      (s) => lineSlug({ mode: s.lineMode, code: s.lineCode }) === lineRef && textSlug(s.stationName) === stationRef,
    ) ?? null
  )
}
