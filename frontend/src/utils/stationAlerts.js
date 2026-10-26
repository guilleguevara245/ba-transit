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
 * - line: no nombran ninguna estacion de la linea, afectan a toda la linea.
 * - elsewhere: nombran otras estaciones de la linea, pero no esta.
 */
export function splitAlertsForStation(alerts, station, lineStationNames) {
  const result = { here: [], line: [], elsewhere: [] }
  const others = [...new Set(lineStationNames)].filter((n) => n !== station.stationName)
  for (const alert of alerts ?? []) {
    const text = `${alert.title ?? ''} ${alert.description ?? ''}`
    if (mentionsStation(text, station.stationName)) result.here.push(alert)
    else if (others.some((name) => mentionsStation(text, name))) result.elsewhere.push(alert)
    else result.line.push(alert)
  }
  return result
}
