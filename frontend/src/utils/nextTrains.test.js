import { describe, expect, it } from 'vitest'
import { clockIn, formatArrival, hasLiveArrivals, nextTrainsPath, scheduleLabel, schedulePath } from './nextTrains.js'

describe('nextTrainsPath / schedulePath', () => {
  it('subte y Belgrano Norte tienen vivo; subte y premetro tienen horario', () => {
    expect(nextTrainsPath('SUBTE', 'D', 'Bulnes')).toBe('/api/v1/subte/proximos?linea=D&estacion=Bulnes')
    expect(nextTrainsPath('TREN', 'BELGRANO_NORTE', 'Florida')).toBe('/api/v1/trenes/proximos?linea=BELGRANO_NORTE&estacion=Florida')
    expect(nextTrainsPath('TREN', 'ROCA', 'Bernal')).toBe(null)
    expect(schedulePath('PREMETRO', 'P', 'Pola')).toBe('/api/v1/subte/horario?linea=P&estacion=Pola')
    expect(schedulePath('TREN', 'ROCA', 'Bernal')).toBe(null)
  })
})

describe('hasLiveArrivals', () => {
  it('solo cuenta si hay algun tren', () => {
    expect(hasLiveArrivals(null)).toBe(false)
    expect(hasLiveArrivals({ available: true, directions: [] })).toBe(false)
    expect(hasLiveArrivals({ available: true, directions: [{ arrivals: [] }] })).toBe(false)
    expect(hasLiveArrivals({ available: true, directions: [{ arrivals: [{ minutes: 2 }] }] })).toBe(true)
  })
})

describe('scheduleLabel', () => {
  const now = new Date(2026, 9, 26, 5, 0)
  it('proximas pasadas aproximadas', () => {
    expect(scheduleLabel({ headwayMinutes: 5, arrivals: [{ minutes: 2, estimated: true }, { minutes: 7, estimated: true }] }, now)).toBe('~2 min · ~7 min')
  })
  it('antes del servicio muestra el primer tren', () => {
    expect(scheduleLabel({ headwayMinutes: null, arrivals: [{ minutes: 30, estimated: true }] }, now)).toBe('Primer tren 5:30')
    expect(clockIn(75, now)).toBe('6:15')
  })
  it('sin mas trenes', () => {
    expect(scheduleLabel({ headwayMinutes: null, arrivals: [] }, now)).toBe('Sin más trenes hoy')
  })
})

describe('formatArrival', () => {
  it('minutos, y desde la hora en horas y minutos', () => {
    expect(formatArrival({ minutes: 0 })).toBe('llegando')
    expect(formatArrival({ minutes: 26 })).toBe('26 min')
    expect(formatArrival({ minutes: 87 })).toBe('1 h 27 min')
    expect(formatArrival({ minutes: 120 })).toBe('2 h')
    expect(formatArrival({ minutes: 65, estimated: true })).toBe('~1 h 5 min')
  })
})
