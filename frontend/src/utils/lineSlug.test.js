import { describe, expect, it } from 'vitest'
import { findLine, findStation, linePath, lineSlug, stationPath, textSlug } from './lineSlug.js'

const LINES = [
  { id: 2, mode: 'SUBTE', code: 'B' },
  { id: 7, mode: 'PREMETRO', code: 'P' },
  { id: 10, mode: 'TREN', code: 'SAN_MARTIN' },
]

describe('lineSlug', () => {
  it('subte, premetro y trenes', () => {
    expect(lineSlug(LINES[0])).toBe('subte-b')
    expect(lineSlug(LINES[1])).toBe('premetro')
    expect(lineSlug(LINES[2])).toBe('san-martin')
    expect(lineSlug({ mode: 'TREN', code: 'TREN_DE_LA_COSTA' })).toBe('tren-de-la-costa')
  })

  it('sin codigo usa el id', () => {
    expect(linePath({ id: 10 })).toBe('/lineas/10')
    expect(linePath(LINES[2])).toBe('/lineas/san-martin')
  })

  it('encuentra la linea por slug o por id (links viejos)', () => {
    expect(findLine(LINES, 'san-martin').id).toBe(10)
    expect(findLine(LINES, '10').id).toBe(10)
    expect(findLine(LINES, 'subte-z')).toBe(null)
  })
})

describe('estaciones', () => {
  const STATIONS = [
    { stationId: 27, stationName: 'Medrano', lineMode: 'SUBTE', lineCode: 'B' },
    { stationId: 300, stationName: 'J. M. Bosch', lineMode: 'TREN', lineCode: 'URQUIZA' },
    { stationId: 80, stationName: 'Plaza de Mayo', lineMode: 'SUBTE', lineCode: 'A' },
  ]

  it('arma la direccion con la linea y el nombre sin tildes', () => {
    expect(textSlug('Ejército de los Andes')).toBe('ejercito-de-los-andes')
    expect(stationPath(STATIONS[0])).toBe('/estaciones/subte-b/medrano')
    expect(stationPath(STATIONS[1])).toBe('/estaciones/urquiza/j-m-bosch')
    expect(stationPath({ stationId: 5, stationName: 'X' })).toBe('/estaciones/5')
  })

  it('encuentra la estacion por slugs o por id', () => {
    expect(findStation(STATIONS, 'subte-a', 'plaza-de-mayo').stationId).toBe(80)
    expect(findStation(STATIONS, '27').stationId).toBe(27)
    expect(findStation(STATIONS, 'subte-b', 'nada')).toBe(null)
  })
})
