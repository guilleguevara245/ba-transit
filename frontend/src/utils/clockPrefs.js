import { PREFS_CHANGED } from './prefsEvents.js'

/**
 * Como se muestra el reloj del header: formato de la hora (24 o 12 h) y
 * la fecha (larga, corta o sin fecha). Se guarda en el navegador y, con
 * cuenta, se sincroniza como el tema.
 */
export const CLOCK_KEY = 'ba-transit:reloj'
export const CLOCK_CHANGED = 'ba-transit:reloj-cambio'
export const DEFAULT_CLOCK = { formato: '24', fecha: 'larga' }
export const CLOCK_FORMATS = ['24', '12']
export const CLOCK_DATES = ['larga', 'corta', 'sin']

/** { formato, fecha } valido (lo que no es valido toma el valor por defecto), o null. */
export function cleanClock(c) {
  if (!c || typeof c !== 'object') return null
  const formato = CLOCK_FORMATS.includes(c.formato) ? c.formato : null
  const fecha = CLOCK_DATES.includes(c.fecha) ? c.fecha : null
  if (!formato && !fecha) return null
  return { formato: formato ?? DEFAULT_CLOCK.formato, fecha: fecha ?? DEFAULT_CLOCK.fecha }
}

/** Lo que eligio la persona en este navegador, o null si nunca lo cambio. */
export function readSavedClock() {
  try {
    return cleanClock(JSON.parse(window.localStorage.getItem(CLOCK_KEY) ?? 'null'))
  } catch {
    return null
  }
}

/** Lo que se usa: lo elegido o el valor por defecto. */
export function readClock() {
  return readSavedClock() ?? DEFAULT_CLOCK
}

/** Guarda la eleccion. silent: sin subirla a la cuenta (viene de la cuenta). */
export function saveClock(clock, { silent = false } = {}) {
  const clean = cleanClock(clock)
  if (!clean) return
  try {
    window.localStorage.setItem(CLOCK_KEY, JSON.stringify(clean))
  } catch {
    // Sin almacenamiento: vale para esta visita.
  }
  window.dispatchEvent(new window.CustomEvent(CLOCK_CHANGED, { detail: clean }))
  if (!silent) window.dispatchEvent(new window.CustomEvent(PREFS_CHANGED))
}
