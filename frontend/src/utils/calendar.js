import { HOLIDAYS, localDateKey } from './holidays.js'

/**
 * El calendario del panel del reloj: la grilla del mes (lunes primero),
 * los feriados y que horario de transporte rige cada dia.
 */

export const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const pad = (n) => String(n).padStart(2, '0')

/** "2026-10-30" -> { year, month (0-11), day, weekday (0 = domingo) }. */
export function parseKey(key) {
  const [year, month, day] = key.split('-').map(Number)
  return { year, month: month - 1, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() }
}

/**
 * El tipo de un dia: 'feriado', 'no-laborable' (dia no laborable con fines
 * turisticos), 'domingo', 'sabado' o 'habil', con el nombre del feriado.
 */
export function dayKind(key) {
  const name = HOLIDAYS[key] ?? null
  if (name) return { kind: /no laborable/i.test(name) ? 'no-laborable' : 'feriado', name }
  const { weekday } = parseKey(key)
  return { kind: weekday === 0 ? 'domingo' : weekday === 6 ? 'sabado' : 'habil', name: null }
}

/** Que horario rige ese dia, en una frase corta. */
export function scheduleText(key) {
  const { kind } = dayKind(key)
  if (kind === 'feriado') return 'Feriado: subte y trenes con horario de domingo.'
  if (kind === 'no-laborable') return 'Día no laborable: el transporte funciona, puede haber menos frecuencia.'
  if (kind === 'domingo') return 'Domingo: horario de domingo.'
  if (kind === 'sabado') return 'Sábado: horario de sábado.'
  return 'Día hábil: horario normal.'
}

/**
 * Las semanas del mes: [[{ key, day } | null x 7], ...], de lunes a
 * domingo; null en los dias de otro mes.
 */
export function monthGrid(year, month) {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const offset = (first + 6) % 7 // lunes = 0
  const cells = Array.from({ length: offset }, () => null)
  for (let d = 1; d <= days; d++) cells.push({ key: `${year}-${pad(month + 1)}-${pad(d)}`, day: d })
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Los feriados y dias no laborables del mes: [{ key, day, weekday, name, kind }]. */
export function monthHolidays(year, month) {
  const prefix = `${year}-${pad(month + 1)}-`
  return Object.keys(HOLIDAYS)
    .filter((key) => key.startsWith(prefix))
    .sort()
    .map((key) => {
      const { day, weekday } = parseKey(key)
      return { key, day, weekday: WEEKDAYS[weekday], ...dayKind(key) }
    })
}

/** El mes de hoy en Buenos Aires: { year, month, todayKey }. */
export function currentMonth(now = new Date()) {
  const todayKey = localDateKey(now)
  const { year, month } = parseKey(todayKey)
  return { year, month, todayKey }
}

/** El mes siguiente (step 1) o anterior (step -1). */
export function shiftMonth({ year, month }, step) {
  const total = year * 12 + month + step
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}
