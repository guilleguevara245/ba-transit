import { TIME_ZONE } from './format.js'

/**
 * Feriados nacionales y dias no laborables de Argentina, por fecha en
 * que efectivamente se descansa (los trasladables ya movidos).
 *
 * 2026: calendario oficial, con los dias no laborables con fines
 * turisticos fijados por el Gobierno nacional.
 * 2027: feriados inamovibles y trasladables segun la Ley 27.399 (martes
 * y miercoles pasan al lunes anterior; jueves y viernes, al lunes
 * siguiente). Los dias puente de 2027 todavia no estan definidos:
 * agregarlos cuando salga el decreto.
 */
export const HOLIDAYS = {
  '2026-01-01': 'Año Nuevo',
  '2026-02-16': 'Carnaval',
  '2026-02-17': 'Carnaval',
  '2026-03-23': 'Día no laborable con fines turísticos',
  '2026-03-24': 'Día Nacional de la Memoria por la Verdad y la Justicia',
  '2026-04-02': 'Día del Veterano y de los Caídos en la Guerra de Malvinas',
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajador',
  '2026-05-25': 'Día de la Revolución de Mayo',
  '2026-06-15': 'Paso a la Inmortalidad del General Güemes',
  '2026-06-20': 'Paso a la Inmortalidad del General Belgrano',
  '2026-07-09': 'Día de la Independencia',
  '2026-07-10': 'Día no laborable con fines turísticos',
  '2026-08-17': 'Paso a la Inmortalidad del General San Martín',
  '2026-10-12': 'Día del Respeto a la Diversidad Cultural',
  '2026-11-23': 'Día de la Soberanía Nacional',
  '2026-12-07': 'Día no laborable con fines turísticos',
  '2026-12-08': 'Inmaculada Concepción de María',
  '2026-12-25': 'Navidad',

  '2027-01-01': 'Año Nuevo',
  '2027-02-08': 'Carnaval',
  '2027-02-09': 'Carnaval',
  '2027-03-24': 'Día Nacional de la Memoria por la Verdad y la Justicia',
  '2027-03-26': 'Viernes Santo',
  '2027-04-02': 'Día del Veterano y de los Caídos en la Guerra de Malvinas',
  '2027-05-01': 'Día del Trabajador',
  '2027-05-25': 'Día de la Revolución de Mayo',
  '2027-06-20': 'Paso a la Inmortalidad del General Belgrano',
  '2027-06-21': 'Paso a la Inmortalidad del General Güemes',
  '2027-07-09': 'Día de la Independencia',
  '2027-08-16': 'Paso a la Inmortalidad del General San Martín',
  '2027-10-11': 'Día del Respeto a la Diversidad Cultural',
  '2027-11-20': 'Día de la Soberanía Nacional',
  '2027-12-08': 'Inmaculada Concepción de María',
  '2027-12-25': 'Navidad',
}

/** Fecha AAAA-MM-DD en Buenos Aires (no en la zona del navegador). */
export function localDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(date)
}

/** Nombre del feriado de ese dia, o null si es un dia habitual. */
export function holidayOn(date) {
  return HOLIDAYS[localDateKey(date)] ?? null
}
