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
