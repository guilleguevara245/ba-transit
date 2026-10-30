/** Preferencias de avisos sin navegador ni red (para poder probarlas). */

/**
 * Une lo guardado con los valores por defecto. Si lo guardado es de una
 * version anterior, suma una vez los tipos de aviso nuevos (despues, si
 * la persona los apaga, quedan apagados).
 */
export function upgradePrefs(saved, defaults, newKinds) {
  if (!saved || typeof saved !== 'object') return { ...defaults }
  const prefs = { ...defaults, ...saved }
  if ((saved.version ?? 1) < defaults.version) {
    prefs.kinds = [...new Set([...(Array.isArray(saved.kinds) ? saved.kinds : []), ...newKinds])]
    prefs.version = defaults.version
  }
  return prefs
}

/** Si la pausa sigue vigente. */
export function isPaused(prefs, now = new Date()) {
  return Boolean(prefs.pausedUntil) && new Date(prefs.pausedUntil) > now
}

/** "hasta las 16:30", "hasta mañana a las 06:00", "hasta el lunes a las 06:00". */
export function pauseLabel(until, now = new Date()) {
  const date = new Date(until)
  const fmt = (d, o) => new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Buenos_Aires', ...o }).format(d)
  const day = (d) => fmt(d, { year: 'numeric', month: '2-digit', day: '2-digit' })
  const time = `las ${fmt(date, { hour: '2-digit', minute: '2-digit', hour12: false })}`
  if (day(date) === day(now)) return `hasta ${time}`
  if (day(date) === day(new Date(now.getTime() + 24 * 3600_000))) return `hasta mañana a ${time}`
  return `hasta el ${fmt(date, { weekday: 'long' })} a ${time}`
}

