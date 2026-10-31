/** Como se muestra cada estado de una fuente (ver SourceHealth en el backend). */
export const STATUS_LABELS = {
  OK: { text: 'Funciona', tone: 'ok' },
  ERROR: { text: 'Con problemas', tone: 'error' },
  SIN_DATOS: { text: 'Sin consultar', tone: 'idle' },
}

/**
 * Resumen de arriba, en palabras simples: todo funciona, o que anda mal.
 * title va grande; text explica que pasa mientras tanto.
 */
export function statusSummary(sources = []) {
  const failing = sources.filter((s) => s.status === 'ERROR')
  if (failing.length === 0) {
    return { tone: 'ok', title: 'Todo funciona', text: 'Todos los datos que consultamos están llegando bien.' }
  }
  const meanwhile = 'Mientras tanto, el sitio muestra los últimos datos que tiene.'
  if (failing.length === 1) {
    return { tone: 'error', title: `${failing[0].what}: con problemas`, text: meanwhile }
  }
  return { tone: 'error', title: `${failing.length} servicios con problemas`, text: meanwhile }
}

/**
 * Grupos de la pagina de estado, como los conoce quien usa el sitio: cada
 * uno con su icono (ModeIcon) y las fuentes (por key) con un nombre corto.
 */
export const STATUS_GROUPS = [
  {
    id: 'subte',
    title: 'Subte',
    icon: 'SUBTE',
    items: { 'subte-alertas': 'Alertas', 'subte-horario': 'Horarios programados' },
  },
  {
    id: 'trenes',
    title: 'Trenes',
    icon: 'TREN',
    items: {
      'trenes-avisos': 'Avisos de Trenes Argentinos',
      ferrovias: 'Próximos trenes del Belgrano Norte',
      metrovias: 'Estado del Urquiza',
    },
  },
  {
    id: 'vivo',
    title: 'Colectivos y EcoBici',
    icon: 'COLECTIVO',
    items: { 'transporte-vivo': 'Subte, colectivos y EcoBici en vivo', 'colectivos-recorridos': 'Recorridos' },
  },
  { id: 'accesos', title: 'Accesos', icon: 'ACCESOS', items: { tomtom: 'Tránsito en las autopistas' } },
  {
    id: 'clima',
    title: 'Clima',
    icon: 'CLIMA',
    items: { smn: 'Alertas del SMN', pronostico: 'Pronóstico' },
  },
  { id: 'aviones', title: 'Aeropuertos', icon: 'AEROPUERTO', items: { 'adsb-lol': 'Aviones en vivo' } },
  { id: 'noticias', title: 'Noticias', icon: 'NOTICIAS', items: { noticias: 'Noticias del transporte' } },
  {
    id: 'cuenta',
    title: 'Tu cuenta',
    icon: 'CUENTA',
    items: { brevo: 'Mails (recuperar la contraseña)', georef: 'Direcciones (Mis lugares y Cómo llegar)' },
  },
]

const RANK = { ERROR: 2, OK: 1, SIN_DATOS: 0 }

/**
 * Las fuentes agrupadas: [{ id, title, icon, status, sources }]. status
 * del grupo: el peor de sus fuentes (con problemas > funciona > sin
 * consultar). Las fuentes que no estan en ningun grupo van a "Otros".
 */
export function statusGroups(sources = []) {
  const used = new Set()
  const groups = STATUS_GROUPS.map((group) => {
    const list = sources
      .filter((s) => Object.hasOwn(group.items, s.key))
      .map((s) => {
        used.add(s.key)
        return { ...s, name: group.items[s.key] }
      })
    return { id: group.id, title: group.title, icon: group.icon, sources: list }
  })
  const others = sources.filter((s) => !used.has(s.key)).map((s) => ({ ...s, name: s.what }))
  if (others.length > 0) groups.push({ id: 'otros', title: 'Otros', icon: 'LUGAR', sources: others })
  return groups
    .filter((g) => g.sources.length > 0)
    .map((g) => ({
      ...g,
      status: g.sources.reduce((worst, s) => (RANK[s.status] > RANK[worst] ? s.status : worst), 'SIN_DATOS'),
    }))
}

/** Motivo de una falla en palabras (el backend manda el tipo de error o "HTTP 503"). */
export function errorLabel(reason) {
  if (!reason) return null
  if (/Timeout/i.test(reason)) return 'tardó demasiado en responder'
  if (/Connect|UnknownHost|NoRouteToHost/i.test(reason)) return 'no se pudo conectar'
  // "HTTP 403" o "HTTP 403: detalle" (el detalle lo arma el backend, por ejemplo el de Brevo).
  const http = /^HTTP (\d{3})(?:: (.+))?$/.exec(reason)
  if (http?.[2]) return `${http[2]} (HTTP ${http[1]})`
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
