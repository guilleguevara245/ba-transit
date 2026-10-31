import { describe, expect, it } from 'vitest'
import { commuteTrip, hasCommute } from './commute.js'

const st = (stationId, stationName, lineId, lineName, branchId, sequenceOrder, latitude, longitude) => ({
  stationId,
  stationName,
  lineId,
  lineName,
  lineMode: lineId === 1 ? 'SUBTE' : 'TREN',
  lineCode: lineId === 1 ? 'B' : 'SARMIENTO',
  lineColorHex: '#000000',
  branchId,
  sequenceOrder,
  latitude,
  longitude,
})

// Subte B de Alem a Pueyrredón y el Sarmiento desde Once (combinan caminando).
const stations = [
  st(1, 'Alem', 1, 'Línea B', 1, 1, -34.603, -58.37),
  st(2, 'Callao', 1, 'Línea B', 1, 2, -34.604, -58.392),
  st(3, 'Pueyrredón', 1, 'Línea B', 1, 3, -34.6045, -58.4053),
  st(4, 'Once', 2, 'Línea Sarmiento', 2, 1, -34.6077, -58.4058),
  st(5, 'Caballito', 2, 'Línea Sarmiento', 2, 2, -34.6189, -58.4423),
  st(6, 'Flores', 2, 'Línea Sarmiento', 2, 3, -34.6286, -58.4637),
]

describe('commuteTrip', () => {
  it('de Casa (estacion) a Trabajo (estacion mas cercana a la direccion)', () => {
    const places = [
      { tipo: 'casa', estacion: 6 },
      { tipo: 'trabajo', estacion: null, direccion: 'Av Corrientes 1500, Ciudad de Buenos Aires', cerca: 2 },
    ]
    const trip = commuteTrip(places, stations)
    expect(trip.minutes).toBeGreaterThan(5)
    expect(trip.lines).toBe('Líneas Sarmiento y B')
    expect(trip.link).toBe('/como-llegar?desde=lugar-6&hasta=lugar-2')
    expect(trip.nearest).toBe(true)
  })

  it('sin Casa o Trabajo con estacion, misma estacion o sin estaciones: nada', () => {
    expect(commuteTrip([{ tipo: 'casa', estacion: 6 }], stations)).toBeNull()
    expect(
      commuteTrip(
        [
          { tipo: 'casa', estacion: 2 },
          { tipo: 'trabajo', cerca: 2 },
        ],
        stations,
      ),
    ).toBeNull()
    expect(
      commuteTrip(
        [
          { tipo: 'casa', estacion: 6 },
          { tipo: 'trabajo', estacion: 2 },
        ],
        null,
      ),
    ).toBeNull()
  })

  it('hasCommute', () => {
    expect(
      hasCommute([
        { tipo: 'casa', cerca: 3 },
        { tipo: 'trabajo', estacion: 1 },
      ]),
    ).toBe(true)
    expect(
      hasCommute([
        { tipo: 'casa', direccion: 'x' },
        { tipo: 'trabajo', estacion: 1 },
      ]),
    ).toBe(false)
  })
})
