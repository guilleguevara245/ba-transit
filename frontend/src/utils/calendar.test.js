import { describe, expect, it } from 'vitest'
import { currentMonth, dayKind, monthGrid, monthHolidays, scheduleText, shiftMonth } from './calendar.js'

describe('monthGrid', () => {
  it('octubre de 2026: empieza un jueves, semanas de lunes a domingo', () => {
    const weeks = monthGrid(2026, 9)
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null])
    expect(weeks[0][3]).toEqual({ key: '2026-10-01', day: 1 })
    expect(weeks.flat().filter(Boolean)).toHaveLength(31)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })
})

describe('dayKind y scheduleText', () => {
  it('feriado, no laborable, fin de semana y dia habil', () => {
    expect(dayKind('2026-11-23')).toEqual({ kind: 'feriado', name: 'Día de la Soberanía Nacional' })
    expect(dayKind('2026-12-07').kind).toBe('no-laborable')
    expect(dayKind('2026-10-31').kind).toBe('sabado')
    expect(dayKind('2026-11-01').kind).toBe('domingo')
    expect(dayKind('2026-10-30').kind).toBe('habil')
    expect(scheduleText('2026-11-23')).toBe('Feriado: subte y trenes con horario de domingo.')
    expect(scheduleText('2026-10-31')).toBe('Sábado: horario de sábado.')
  })
})

describe('monthHolidays', () => {
  it('los feriados del mes con su dia de la semana', () => {
    expect(monthHolidays(2026, 11).map((h) => [h.day, h.weekday, h.kind])).toEqual([
      [7, 'lunes', 'no-laborable'],
      [8, 'martes', 'feriado'],
      [25, 'viernes', 'feriado'],
    ])
    expect(monthHolidays(2026, 8)).toEqual([])
  })
})

describe('currentMonth y shiftMonth', () => {
  it('el mes en Buenos Aires y los saltos de año', () => {
    // 31/10 a la 1 de la mañana en Buenos Aires (4 UTC).
    expect(currentMonth(new Date('2026-10-31T04:00:00Z'))).toEqual({ year: 2026, month: 9, todayKey: '2026-10-31' })
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 })
    expect(shiftMonth({ year: 2027, month: 0 }, -1)).toEqual({ year: 2026, month: 11 })
  })
})
