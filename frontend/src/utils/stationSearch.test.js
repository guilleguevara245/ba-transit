import { describe, expect, it } from 'vitest'
import { matchStations, normalizeText } from './stationSearch.js'

const STATIONS = [
  { stationId: 1, stationName: 'Constitución', lineName: 'Línea C' },
  { stationId: 2, stationName: 'Plaza Constitución', lineName: 'Línea Roca' },
  { stationId: 3, stationName: 'Retiro', lineName: 'Línea Mitre' },
  { stationId: 4, stationName: 'Retiro', lineName: 'Línea C' },
]

describe('matchStations', () => {
  it('ignora tildes y pone primero las que empiezan con el texto', () => {
    expect(normalizeText('  Constitución ')).toBe('constitucion')
    expect(matchStations(STATIONS, 'constitucion').map((s) => s.stationId)).toEqual([1, 2])
  })

  it('busca tambien por linea', () => {
    expect(matchStations(STATIONS, 'retiro mitre').map((s) => s.stationId)).toEqual([3])
  })

  it('sin texto no devuelve nada', () => {
    expect(matchStations(STATIONS, ' ')).toEqual([])
  })
})
