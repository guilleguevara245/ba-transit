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

/** El id de favorito de una linea: su cartel sin espacios y en mayusculas ("53a " -> "53A"); null si no sirve. */
export function busFavoriteId(shortName) {
  const id = (shortName ?? '').replace(/\s+/g, '').toUpperCase()
  return /^[0-9A-Z]{1,8}$/.test(id) ? id : null
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

const LOWER_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'a', 'al', 'en'])

/**
 * Nombre de parada legible: el feed los trae en mayusculas y con un
 * numero interno adelante ("1302 ANTARTIDA ARGENTINA AV.").
 */
export function stopName(name) {
  const clean = (name ?? '').replace(/^\s*\d+\s*[-–]?\s*/, '').trim()
  if (!clean || clean !== clean.toUpperCase()) return clean || (name ?? '')
  return clean
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && LOWER_WORDS.has(word) ? word : word.replace(/^\p{L}/u, (c) => c.toUpperCase()),
    )
    .join(' ')
}

/**
 * Parametros de la URL de una linea (/colectivos?linea=53A&id=283): el
 * numero a la vista y el id del feed para ubicarla sin ambiguedad.
 */
export function busParams(shortName, id) {
  return shortName ? { linea: shortName, id } : { linea: id }
}

/** "12 en la calle ahora" / "Ninguno en la calle ahora". */
export function movingLabel(count) {
  if (count == null) return null
  if (count === 0) return 'Ninguno en la calle ahora'
  return `${count.toLocaleString('es-AR')} en la calle ahora`
}

/** Los avisos de la API Transporte que nombran el numero de esa linea (sin cartel). */
export function alertsForBus(alerts, line) {
  const { number } = parseBusShortName(line)
  const n = String(Number.parseInt(number, 10))
  return (alerts ?? []).filter((a) => (a.lines ?? []).includes(n))
}
