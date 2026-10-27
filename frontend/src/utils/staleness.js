import { DATA_CHECKED, STALE_AFTER_DAYS } from '../data/dataChecks.js'

const DAY_MS = 24 * 60 * 60 * 1000

/** true si el dato (tarifas, peajes, urquiza) no se revisa hace mas de STALE_AFTER_DAYS. */
export function isStale(key, now = new Date()) {
  const checked = DATA_CHECKED[key]
  if (!checked) return false
  return now.getTime() - new Date(`${checked}T12:00:00-03:00`).getTime() > STALE_AFTER_DAYS * DAY_MS
}

export const STALE_TEXT = 'Puede haber cambiado: confirmalo en la fuente oficial.'
