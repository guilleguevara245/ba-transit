/**
 * Favoritos guardados en este navegador: lineas, estaciones, accesos y colectivos.
 * Cada lista se guarda aparte (las lineas conservan su clave de siempre,
 * asi nadie pierde las que ya tenia). Al cambiar una lista se avisa con un
 * evento, para que todos los componentes que la muestran se actualicen,
 * incluso en otras pestañas (evento "storage").
 */

export const FAVORITE_KINDS = {
  // ids numericos de linea
  lineas: { key: 'ba-transit:mis-lineas', valid: Number.isInteger, title: 'Mis líneas' },
  // ids numericos de estacion (cada estacion es de una linea)
  estaciones: { key: 'ba-transit:mis-estaciones', valid: Number.isInteger, title: 'Mis estaciones' },
  // ids de acceso ("norte", "oeste"...)
  accesos: {
    key: 'ba-transit:mis-accesos',
    valid: (id) => typeof id === 'string' && /^[a-z0-9-]{1,40}$/.test(id),
    title: 'Mis accesos',
  },
  // carteles de colectivo ("152", "53A")
  colectivos: {
    key: 'ba-transit:mis-colectivos',
    valid: (id) => typeof id === 'string' && /^[0-9A-Z]{1,8}$/.test(id),
    title: 'Mis colectivos',
  },
}

export const FAVORITES_CHANGED = 'ba-transit:favoritos-cambio'
const MAX_PER_KIND = 50

/** Lee una lista. El almacenamiento puede no estar disponible o tener datos rotos: lista vacia. */
export function readList(kind) {
  const { key, valid } = FAVORITE_KINDS[kind]
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? [...new Set(parsed.filter(valid))].slice(0, MAX_PER_KIND) : []
  } catch {
    return []
  }
}

/** Reemplaza una lista (sin duplicados ni valores invalidos) y avisa. */
export function writeList(kind, ids) {
  const { key, valid } = FAVORITE_KINDS[kind]
  const clean = [...new Set(ids.filter(valid))].slice(0, MAX_PER_KIND)
  try {
    window.localStorage.setItem(key, JSON.stringify(clean))
  } catch {
    // Sin almacenamiento disponible: los favoritos duran lo que dure la pagina.
  }
  window.dispatchEvent(new window.CustomEvent(FAVORITES_CHANGED, { detail: { kind, ids: clean } }))
  return clean
}

export function toggleInList(kind, id) {
  const current = readList(kind)
  return writeList(kind, current.includes(id) ? current.filter((x) => x !== id) : [...current, id])
}

/** Todas las listas juntas: { lineas: [...], estaciones: [...], accesos: [...] }. */
export function readAll() {
  return Object.fromEntries(Object.keys(FAVORITE_KINDS).map((kind) => [kind, readList(kind)]))
}

/** Une dos juegos de favoritos (por ejemplo, los de este navegador y los de la cuenta). */
export function mergeFavorites(a, b) {
  return Object.fromEntries(
    Object.keys(FAVORITE_KINDS).map((kind) => [kind, [...new Set([...(a?.[kind] ?? []), ...(b?.[kind] ?? [])])]]),
  )
}
