/**
 * Nombres legibles para las lineas de colectivo del feed GTFS.
 *
 * En el feed, short_name trae numero y cartel juntos ("53A") y
 * long_name suele ser un codigo interno ("JNAMBA053") que no le dice
 * nada al usuario.
 */

/** "53A" -> { number: "53", sign: "A" }; "152" -> { number: "152", sign: "" }. */
export function parseBusShortName(shortName) {
  const match = /^(\d+)\s*([A-Za-z]{0,3})$/.exec((shortName ?? '').trim())
  if (!match) return { number: (shortName ?? '').trim(), sign: '' }
  return { number: match[1], sign: match[2].toUpperCase() }
}

/** "Línea 53 · Cartel A" o "Línea 152". */
export function busTitle(route) {
  const { number, sign } = parseBusShortName(route.shortName)
  if (!number) return 'Línea sin número'
  return sign ? `Línea ${number} · Cartel ${sign}` : `Línea ${number}`
}

/** Codigos internos del tipo "JNAMBA053" o "JMLDZM532". */
const INTERNAL_CODE = /^[A-Z]{4,}\d+$/

/** El long_name solo si es un nombre real (por ejemplo "Retiro - Constitución"). */
export function busDescription(route) {
  const name = (route.longName ?? '').trim()
  if (!name || INTERNAL_CODE.test(name.replace(/\s+/g, '')) || name === route.shortName) return null
  return name
}
