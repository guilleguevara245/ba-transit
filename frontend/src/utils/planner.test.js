import { describe, expect, it } from 'vitest'
import { googleMapsUrl, planTrip } from './planner.js'

// Dos lineas que se cruzan: A (oeste-este) y D (norte-sur), con una
// combinacion oficial A:Peru <-> D:Catedral (a ~150 m).
const st = (id, lineId, lineCode, branchId, seq, name, lat, lon, lineMode = 'SUBTE') => ({
  stationId: id, lineId, lineCode, lineName: `Línea ${lineCode}`, lineMode, branchId, sequenceOrder: seq,
  stationName: name, latitude: lat, longitude: lon,
})
const STATIONS = [
  st(1, 1, 'A', 1, 1, 'Plaza de Mayo', -34.6088, -58.3709),
  st(2, 1, 'A', 1, 2, 'Perú', -34.6086, -58.3742),
  st(3, 1, 'A', 1, 3, 'Piedras', -34.6089, -58.3790),
  st(4, 4, 'D', 4, 1, 'Catedral', -34.6075, -58.3739),
  st(5, 4, 'D', 4, 2, '9 de Julio', -34.6045, -58.3805),
  st(6, 4, 'D', 4, 3, 'Tribunales', -34.6018, -58.3846),
]

describe('planTrip', () => {
  it('viaja en una sola linea sin combinaciones', () => {
    const plan = planTrip(STATIONS, STATIONS[0], STATIONS[2])
    expect(plan.transfers).toBe(0)
    expect(plan.legs).toHaveLength(1)
    expect(plan.legs[0].stops).toBe(2)
    expect(plan.legs[0].towards.stationName).toBe('Piedras')
  })

  it('combina caminando entre lineas', () => {
    const plan = planTrip(STATIONS, STATIONS[0], STATIONS[5])
    expect(plan.legs.map((l) => l.type)).toEqual(['ride', 'walk', 'ride'])
    expect(plan.legs[1].to.stationName).toBe('Catedral')
    expect(plan.legs[2].towards.stationName).toBe('Tribunales')
    expect(plan.transfers).toBe(1)
  })
})

describe('googleMapsUrl', () => {
  it('arma el enlace en modo transporte publico', () => {
    const url = googleMapsUrl({ latitude: -34.6, longitude: -58.4 }, 'Obelisco')
    expect(url).toContain('travelmode=transit')
    expect(url).toContain('destination=Obelisco')
  })
})
