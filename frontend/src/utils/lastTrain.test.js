import { describe, expect, it } from 'vitest'
import { lastTrainsAt, serviceDayType } from './lastTrain.js'

const st = (id, seq, name, lat, lon) => ({ stationId: id, sequenceOrder: seq, stationName: name, latitude: lat, longitude: lon })
// Primeras estaciones de la linea A y una cabecera ficticia "San Pedrito".
const BRANCH = [
  st(1, 1, 'Plaza de Mayo', -34.6088, -58.3709),
  st(2, 2, 'Perú', -34.6086, -58.3742),
  st(3, 3, 'San Pedrito', -34.6300, -58.4700),
]

describe('serviceDayType', () => {
  it('distingue habiles, sabados, domingos y feriados', () => {
    expect(serviceDayType(new Date('2026-10-23T15:00:00-03:00'))).toBe(0) // viernes
    expect(serviceDayType(new Date('2026-10-24T15:00:00-03:00'))).toBe(1) // sabado
    expect(serviceDayType(new Date('2026-10-25T15:00:00-03:00'))).toBe(2) // domingo
    expect(serviceDayType(new Date('2026-11-23T15:00:00-03:00'))).toBe(2) // feriado
    expect(serviceDayType(new Date('2026-10-24T01:00:00-03:00'))).toBe(0) // madrugada del sabado: viernes
  })
})

describe('lastTrainsAt', () => {
  it('suma el viaje desde cada cabecera', () => {
    const friday = new Date('2026-10-23T15:00:00-03:00')
    const result = lastTrainsAt('A', BRANCH, BRANCH[1], friday)
    expect(result.map((r) => r.towards)).toEqual(['San Pedrito', 'Plaza de Mayo'])
    expect(result[0].time).toBe('23:27') // 23:26 desde Plaza de Mayo + 1 min
  })

  it('en una cabecera solo muestra el tren que sale', () => {
    const result = lastTrainsAt('A', BRANCH, BRANCH[0], new Date('2026-10-23T15:00:00-03:00'))
    expect(result).toEqual([{ towards: 'San Pedrito', time: '23:26' }])
  })

  it('Urquiza: reparte los 49 min entre cabeceras segun la distancia', () => {
    // Tres estaciones equidistantes: la del medio esta a mitad de viaje.
    const urquiza = [
      st(10, 1, 'Federico Lacroze', -34.5870, -58.4550),
      st(11, 2, 'Mitad', -34.5870, -58.5550),
      st(12, 3, 'General Lemos', -34.5870, -58.6550),
    ]
    const result = lastTrainsAt('URQUIZA', urquiza, urquiza[1], new Date('2026-10-23T15:00:00-03:00'))
    // 23:50 desde Lacroze + 24,5 min; 23:59 desde Lemos + 24,5 min (redondeo de medio minuto).
    expect(result.map((r) => r.towards)).toEqual(['General Lemos', 'Federico Lacroze'])
    expect(result[0].time).toMatch(/^0:1[45]$/)
    expect(result[1].time).toMatch(/^0:2[34]$/)
  })
})
