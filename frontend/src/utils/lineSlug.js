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
