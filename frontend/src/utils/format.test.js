import { describe, expect, it } from 'vitest'
import { formatClock, formatDayDate, formatLongDate, formatRelativeTime, formatShortDate, yearsSince } from './format.js'

const NOW = new Date('2026-10-23T15:00:00Z')

describe('formatRelativeTime', () => {
  it('menos de un minuto', () => {
    expect(formatRelativeTime('2026-10-23T14:59:40Z', NOW)).toBe('hace un momento')
  })

  it('minutos, horas y dias', () => {
    expect(formatRelativeTime('2026-10-23T14:45:00Z', NOW)).toBe('hace 15 min')
    expect(formatRelativeTime('2026-10-23T14:00:00Z', NOW)).toBe('hace 1 hora')
    expect(formatRelativeTime('2026-10-23T10:00:00Z', NOW)).toBe('hace 5 horas')
    expect(formatRelativeTime('2026-10-21T15:00:00Z', NOW)).toBe('hace 2 días')
  })
})

describe('formatClock', () => {
  it('usa formato 24 hs y hora de Buenos Aires', () => {
    // 01:50 UTC del 25/10 son las 22:50 del 24/10 en Buenos Aires.
    expect(formatClock(new Date('2026-10-25T01:50:00Z'))).toBe('22:50')
    expect(formatClock(new Date('2026-10-24T12:05:00Z'))).toBe('09:05')
  })
})

describe('formatShortDate', () => {
  it('dia, numero y mes abreviados, en hora de Buenos Aires', () => {
    // 01:50 UTC del 25/10 todavia es sabado 24 en Buenos Aires.
    expect(formatShortDate(new Date('2026-10-25T01:50:00Z'))).toBe('Sáb 24 oct')
  })
})

describe('formatDayDate', () => {
  it('fecha completa en castellano, en hora de Buenos Aires', () => {
    expect(formatDayDate(new Date('2026-10-25T01:50:00Z'))).toBe('Sábado 24 de octubre')
    expect(formatDayDate(new Date('2026-11-23T15:00:00Z'))).toBe('Lunes 23 de noviembre')
  })
})

describe('formatLongDate', () => {
  it('escribe la fecha en castellano', () => {
    expect(formatLongDate('1913-12-01')).toBe('1 de diciembre de 1913')
    expect(formatLongDate(null)).toBeNull()
  })
})

describe('yearsSince', () => {
  it('cuenta los años cumplidos', () => {
    expect(yearsSince('1913-12-01', new Date(2026, 9, 25))).toBe(112)
    expect(yearsSince('1913-10-01', new Date(2026, 9, 25))).toBe(113)
  })
})
