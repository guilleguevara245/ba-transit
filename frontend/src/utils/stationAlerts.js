import { normalizeText } from './stationSearch.js'

/**
 * Formas en que una alerta puede nombrar a una estacion: el nombre
 * completo, cada parte de los nombres dobles ("Plaza de los Virreyes -
 * Eva Peron", "Once - 30 de Diciembre") y el nombre sin "General",
 * "Plaza" o "Avenida" adelante ("Entre Rios y Urquiza cerradas").
 * Se ignoran las formas muy cortas, que darian falsos positivos.
 */
export function stationAliases(name) {
  const full = normalizeText(name)
  const parts = full.split(/\s+-\s+/)
  const aliases = new Set([full, ...parts])
  for (const part of parts) {
    const stripped = part.replace(/^(general|gral\.?|plaza|avenida|av\.?)\s+/, '')
    aliases.add(stripped)
  }
  return [...aliases].filter((a) => a.length >= 4)
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Si el texto de la alerta nombra a la estacion (como palabra completa).
 * Cuando el texto dice "estacion" o "estaciones", solo cuenta lo que viene
 * despues: en "Ramales Plaza Constitucion - Ezeiza: La estacion Hipolito
 * Yrigoyen se encuentra cerrada" la cerrada es Hipolito Yrigoyen, no
 * Plaza Constitucion.
 */
export function mentionsStation(text, stationName) {
  const full = normalizeText(text)
  const marker = full.search(/\bestacion(es)?\b/)
  const haystack = marker >= 0 ? full.slice(marker) : full
  return stationAliases(stationName).some((alias) => new RegExp(`(^|[^\\p{L}\\d])${escape(alias)}($|[^\\p{L}\\d])`, 'u').test(haystack))
}

/**
 * Reparte las alertas de una linea respecto de una estacion:
 * - here: nombran a esta estacion (por ejemplo, "Estacion Medrano cerrada").
 * - line: no nombran ninguna estacion de la linea, afectan a toda la linea
 *   (o a un ramal de esta estacion).
 * - elsewhere: nombran otras estaciones de la linea, pero no esta, o son de
 *   un ramal que no pasa por esta estacion.
 * branchIds: los ramales de la estacion (una estacion compartida tiene
 * varios); sin ellos, el ramal de la alerta no se tiene en cuenta.
 */
export function splitAlertsForStation(alerts, station, lineStationNames, branchIds = null) {
  const result = { here: [], line: [], elsewhere: [] }
  const others = [...new Set(lineStationNames)].filter((n) => n !== station.stationName)
  for (const alert of alerts ?? []) {
    const text = `${alert.title ?? ''} ${alert.description ?? ''}`
    if (alert.branchId != null && branchIds && !branchIds.includes(alert.branchId)) result.elsewhere.push(alert)
    else if (mentionsStation(text, station.stationName)) result.here.push(alert)
    else if (others.some((name) => mentionsStation(text, name))) result.elsewhere.push(alert)
    else result.line.push(alert)
  }
  return result
}

/**
 * Que tipo de aviso tiene una estacion, para el icono y la etiqueta:
 * 'closed' (cerrada: cruz roja), 'info' (un aviso positivo, como un horario
 * extendido: sin senal de peligro) o 'warning' (lo demas: el triangulo).
 */
export function noticeKind(alert) {
  if (/cerrad/i.test(alert?.description ?? '')) return 'closed'
  if (alert?.type === 'AVISO') return 'info'
  return 'warning'
}

/** La etiqueta de al lado de la estacion: "Cerrada", o el tipo del aviso ("Obra", "Aviso"). */
export const NOTICE_LABELS = { closed: 'Cerrada', info: 'Aviso' }

/** El dibujo de NoticeMark como HTML, para los iconos de Leaflet. */
export function noticeMarkHtml(kind) {
  const shapes = {
    closed: '<circle class="bg" cx="12" cy="12" r="10"/><path class="mark" d="M8.5 8.5l7 7m0-7-7 7"/>',
    info: '<circle class="bg" cx="12" cy="12" r="10"/><path class="mark" d="M12 11v6M12 7.4v.1"/>',
    warning:
      '<path class="bg" d="M10.3 3.2 1.6 18.3a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0z"/>' +
      '<path class="mark" d="M12 9v5M12 17.2v.1"/>',
  }
  return `<span class="notice-mark notice-mark-${kind}"><svg viewBox="0 0 24 24" aria-hidden="true">${shapes[kind]}</svg></span>`
}
