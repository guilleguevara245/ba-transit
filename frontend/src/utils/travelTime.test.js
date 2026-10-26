import { describe, expect, it } from 'vitest'
import { estimateTrip, formatDuration, segmentMinutes } from './travelTime.js'

// Tres estaciones sobre una linea recta, a ~1 km entre si.
const STATIONS = [
  { latitude: -34.6, longitude: -58.4 },
  { latitude: -34.609, longitude: -58.4 },
  { latitude: -34.618, longitude: -58.4 },
]

describe('estimateTrip', () => {
  it('suma los tramos en cualquier sentido', () => {
    const ida = estimateTrip(STATIONS, 0, 2, 'SUBTE')
    expect(ida.stops).toBe(2)
    expect(ida.minutes).toBe(6) // 2 km a 21 km/h
    expect(estimateTrip(STATIONS, 2, 0, 'SUBTE')).toEqual(ida)
  })

  it('el tren es mas rapido que el subte y cada tramo dura al menos 1 minuto', () => {
    expect(estimateTrip(STATIONS, 0, 2, 'TREN').minutes).toBeLessThan(6)
    expect(segmentMinutes(STATIONS[0], STATIONS[0], 'TREN')).toBe(1)
  })
})

describe('formatDuration', () => {
  it('formatea minutos y horas', () => {
    expect(formatDuration(12)).toBe('12 min')
    expect(formatDuration(65)).toBe('1 h 05 min')
    expect(formatDuration(120)).toBe('2 h')
  })
})
