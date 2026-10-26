/** Como se muestra cada estado de una fuente (ver SourceHealth en el backend). */
export const STATUS_LABELS = {
  OK: { text: 'Funcionando', tone: 'ok' },
  ERROR: { text: 'Con problemas', tone: 'error' },
  SIN_DATOS: { text: 'Sin consultar', tone: 'idle' },
}

/** Resumen de arriba: todas bien, o cuantas fallan. */
export function statusSummary(sources = []) {
  const failing = sources.filter((s) => s.status === 'ERROR')
  if (failing.length === 0) return { tone: 'ok', text: 'Todas las fuentes consultadas están respondiendo.' }
  if (failing.length === 1) return { tone: 'error', text: `${failing[0].what}: la fuente no está respondiendo.` }
  return { tone: 'error', text: `${failing.length} fuentes no están respondiendo.` }
}

/** Motivo de una falla en palabras (el backend manda el tipo de error o "HTTP 503"). */
export function errorLabel(reason) {
  if (!reason) return null
  if (/Timeout/i.test(reason)) return 'tardó demasiado en responder'
  if (/Connect|UnknownHost|NoRouteToHost/i.test(reason)) return 'no se pudo conectar'
  const http = /^HTTP (\d{3})$/.exec(reason)
  if (http) return Number(http[1]) >= 500 ? `error del servidor (HTTP ${http[1]})` : `rechazó la consulta (HTTP ${http[1]})`
  return reason
}

/** true si funciona pero el ultimo intento fallo (falla aislada, se reintenta). */
export function lastAttemptFailed(source) {
  return (
    source.status === 'OK' &&
    source.lastFailure != null &&
    (source.lastSuccess == null || new Date(source.lastFailure) > new Date(source.lastSuccess))
  )
}
