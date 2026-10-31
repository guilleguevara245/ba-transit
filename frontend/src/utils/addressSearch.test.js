import { describe, expect, it } from 'vitest'
import {
  addressQuery,
  addressText,
  confirmedPlace,
  distanceText,
  isSavedAddress,
  matchSavedAddress,
  nearestStation,
  savedAddressQuery,
  stationIdOf,
} from './addressSearch.js'

const options = [
  { stationId: 'lugar-10', stationName: 'Hurlingham', latitude: -34.5889, longitude: -58.6338 },
  { stationId: 'lugar-20', stationName: 'Castelar', latitude: -34.6519, longitude: -58.6436 },
  { stationId: 'lugar-30', stationName: 'Retiro', latitude: -34.5916, longitude: -58.3743 },
]

describe('addressQuery', () => {
  it('limpia espacios y pide al menos 4 letras', () => {
    expect(addressQuery('  Origone   151 ')).toBe('Origone 151')
    expect(addressQuery('Av ')).toBeNull()
    expect(addressQuery(null)).toBeNull()
  })
})

describe('addressText', () => {
  it('direccion y zona', () => {
    expect(addressText({ text: 'Tte Origone 151', area: 'Hurlingham' })).toBe('Tte Origone 151, Hurlingham')
    expect(addressText({ text: 'Tte Origone 151', area: null })).toBe('Tte Origone 151')
  })
})

describe('nearestStation', () => {
  it('la mas cercana a menos de 3 km', () => {
    const near = nearestStation(options, { lat: -34.5891, lon: -58.6392 })
    expect(near.option.stationName).toBe('Hurlingham')
    expect(near.km).toBeLessThan(1)
  })

  it('ninguna si todas quedan lejos', () => {
    expect(nearestStation(options, { lat: -34.9, lon: -58.9 })).toBeNull()
    expect(nearestStation([], { lat: -34.6, lon: -58.4 })).toBeNull()
  })
})

describe('confirmedPlace', () => {
  it('guarda el texto, la zona redondeada y la estacion cercana', () => {
    const address = { text: 'Tte Origone 151', area: 'Hurlingham', lat: -34.5891, lon: -58.6392 }
    expect(confirmedPlace(address, options)).toEqual({
      direccion: 'Tte Origone 151, Hurlingham',
      lat: -34.6,
      lon: -58.65,
      cerca: 10,
    })
  })

  it('sin estacion cerca, cerca queda null', () => {
    const address = { text: 'Ruta 6 1000', area: 'Cañuelas', lat: -35.05, lon: -58.76 }
    expect(confirmedPlace(address, options).cerca).toBeNull()
  })
})

describe('stationIdOf y distanceText', () => {
  it('convierte el id del lugar y escribe la distancia', () => {
    expect(stationIdOf({ stationId: 'lugar-123' })).toBe(123)
    expect(distanceText(0.43)).toBe('a 400 m')
    expect(distanceText(0.04)).toBe('a 100 m')
    expect(distanceText(1.26)).toBe('a 1,3 km')
  })
})

describe('direcciones guardadas en Como llegar', () => {
  const RESULTS = [
    { text: 'Martín Rodríguez 800', area: 'Morón', lat: -34.645, lon: -58.62 },
    { text: 'Martín Rodríguez 800', area: 'Ituzaingó', lat: -34.6545, lon: -58.668 },
  ]

  it('busca solo la calle y la altura', () => {
    expect(savedAddressQuery('Martín Rodríguez 800, Ituzaingó')).toBe('Martín Rodríguez 800')
    expect(savedAddressQuery('Av Rivadavia 5000')).toBe('Av Rivadavia 5000')
  })

  it('elige la de la misma localidad', () => {
    expect(matchSavedAddress(RESULTS, 'Martín Rodríguez 800, Ituzaingó').area).toBe('Ituzaingó')
    expect(matchSavedAddress(RESULTS, 'Martin Rodriguez 800, ITUZAINGO').area).toBe('Ituzaingó')
    expect(matchSavedAddress(RESULTS, 'Martín Rodríguez 800, Hurlingham')).toBeNull()
  })

  it('sin localidad, la primera', () => {
    expect(matchSavedAddress(RESULTS, 'Martín Rodríguez 800').area).toBe('Morón')
    expect(matchSavedAddress([], 'Martín Rodríguez 800')).toBeNull()
  })

  it('reconoce la direccion ya elegida', () => {
    expect(isSavedAddress({ text: 'Av. Rivadavia 5000' }, 'Av Rivadavia 5000, Ciudad de Buenos Aires')).toBe(true)
    expect(isSavedAddress({ text: 'Av. Rivadavia 5100' }, 'Av Rivadavia 5000')).toBe(false)
  })
})
