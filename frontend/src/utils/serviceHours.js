/**
 * Horarios de servicio de subte y premetro.
 * Fuente: Emova, "Horarios del servicio" (emova.com.ar), consultado en
 * octubre de 2026. Los ultimos trenes tienen una variacion de +/- 5 min.
 *
 * Para los trenes no hay una fuente abierta actualizada (el GTFS publico
 * de trenes es de enero de 2024), asi que se enlaza al sitio del operador.
 */

export const DAY_TYPES = ['Lun a vie', 'Sábados', 'Dom y feriados']

const SUBTE_FIRST_TRAIN = ['5:30', '6:00', '8:00']

// Ultimo tren desde cada cabecera: [cabecera, lun-vie, sabados, domingos].
const LAST_TRAINS = {
  A: [
    ['San Pedrito', '23:00', '23:30', '22:08'],
    ['Plaza de Mayo', '23:26', '23:57', '22:36'],
  ],
  B: [
    ['Leandro N. Alem', '23:32', '23:56', '22:31'],
    ['Juan Manuel de Rosas', '23:00', '23:25', '22:00'],
  ],
  C: [
    ['Constitución', '23:19', '23:40', '22:21'],
    ['Retiro', '23:33', '23:54', '22:34'],
  ],
  D: [
    ['Congreso de Tucumán', '23:00', '23:30', '22:00'],
    ['Catedral', '23:32', '00:01', '22:31'],
  ],
  E: [
    ['Retiro', '23:30', '23:58', '22:28'],
    ['Plaza de los Virreyes', '22:56', '23:26', '21:56'],
  ],
  H: [
    ['Hospitales', '23:51', '00:20', '22:51'],
    ['Facultad de Derecho', '23:30', '23:59', '22:29'],
  ],
  P: [
    ['Int. Saguier (a Lugano)', '21:00', '20:56', '21:00'],
    ['Centro Cívico Lugano', '21:31', '21:26', '21:32'],
    ['Int. Saguier (a Savio)', '20:49', '21:07', '20:47'],
    ['General Savio', '21:20', '21:36', '21:19'],
  ],
}

const NOTES = {
  B: 'Viernes y sábados hay servicio nocturno hasta la 1:30 desde algunas estaciones (no aplica en feriados nacionales).',
}

export const OPERATOR_SITES = {
  'Trenes Argentinos Operaciones': 'https://www.trenesargentinos.gob.ar/',
  Metrovías: 'https://www.trenurquiza.com.ar/',
  Ferrovías: 'https://www.ferrovias.com.ar/',
  'Emova Movilidad': 'https://emova.com.ar/',
}

/**
 * Horario de una linea de subte o premetro, o null si no hay datos
 * (por ejemplo, los trenes).
 */
export function serviceHoursFor(line) {
  if (line.mode !== 'SUBTE' && line.mode !== 'PREMETRO') return null
  const lastTrains = LAST_TRAINS[line.code]
  if (!lastTrains) return null
  return {
    firstTrain: SUBTE_FIRST_TRAIN,
    lastTrains: lastTrains.map(([from, ...times]) => ({ from, times })),
    note: NOTES[line.code] ?? null,
  }
}
