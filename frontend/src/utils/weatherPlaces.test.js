import { describe, expect, it } from 'vitest'
import { CAPITAL, gridQuery, toGrid, weatherPlaces } from './weatherPlaces.js'

const stations = [
  { stationId: 1, stationName: 'San Miguel', latitude: -34.5426, longitude: -58.7121 },
  { stationId: 2, stationName: 'Retiro', latitude: -34.5913, longitude: -58.3742 },
  { stationId: 3, stationName: 'Bella Vista', latitude: -34.5583, longitude: -58.6936 },
]

describe('grilla', () => {
  it('redondea a 0,05 grados antes de salir del navegador', () => {
    expect(toGrid(-34.5426)).toBe(-34.55)
    expect(gridQuery({ lat: -34.6037, lon: -58.3816 })).toBe('lat=-34.60&lon=-58.40')
  })
})

describe('weatherPlaces', () => {
  it('sin nada: Capital', () => {
    const [only, ...rest] = weatherPlaces({})
    expect(only.id).toBe(CAPITAL.id)
    expect(only.isDefault).toBe(true)
    expect(rest).toEqual([])
  })

  it('con zona elegida y sin Casa: la zona', () => {
    const [only] = weatherPlaces({ zone: { nombre: 'San Miguel', lat: -34.55, lon: -58.7 } })
    expect(only).toMatchObject({ id: 'zona', label: 'San Miguel' })
  })

  it('Casa y Trabajo lejos: los dos', () => {
    const places = [
      { tipo: 'casa', estacion: 1 },
      { tipo: 'trabajo', estacion: 2 },
    ]
    expect(weatherPlaces({ places, stations }).map((p) => p.id)).toEqual(['casa', 'trabajo'])
  })

  it('Trabajo cerca de Casa: uno solo (es el mismo clima)', () => {
    const places = [
      { tipo: 'casa', estacion: 1 },
      { tipo: 'trabajo', estacion: 3 },
    ]
    expect(weatherPlaces({ places, stations }).map((p) => p.id)).toEqual(['casa'])
  })

  it('Casa con direccion (sin estacion): se usa la zona', () => {
    const places = [{ tipo: 'casa', estacion: null, direccion: 'Av. Siempreviva 742' }]
    const [only] = weatherPlaces({ places, stations, zone: { nombre: 'Moreno', lat: -34.65, lon: -58.8 } })
    expect(only.id).toBe('zona')
  })
})
