import { describe, expect, it } from 'vitest'
import { formatDistance, nearestPlaces, parkingPlaces, parkingTotals, placeDetail } from './parking.js'

const garages = [
  { id: 'mc1', lat: -34.6066, lon: -58.378, address: 'Esmeralda 142', capacity: 30, covered: true, exclusive: true, floors: 2 },
  { id: 'mc2', lat: -34.6044, lon: -58.3781, address: 'Esmeralda 328', capacity: 50, covered: false, exclusive: false, floors: 1 },
]
const street = [{ id: 'mp1', lat: -34.6072, lon: -58.3818, street: '9 de Julio (Cerrito)', between: ['B. Mitre', 'Perón'], where: 'Vereda' }]

describe('parking', () => {
  const places = parkingPlaces({ garages, street })

  it('une las capas', () => {
    expect(places.map((p) => p.layer)).toEqual(['garage', 'garage', 'street'])
    expect(places[2].title).toBe('9 de Julio (Cerrito)')
  })

  it('lee los garajes en formato compacto', () => {
    const [named, plain] = parkingPlaces({
      cars: [
        [-34.6, -58.4, 'Bonpland 1147', 3, 'San Jorge', 'Palermo'],
        [-34.6, -58.4, 'Córdoba 5640', 1, '', 'Chacarita'],
      ],
    })
    expect(named.title).toBe('San Jorge · Bonpland 1147')
    expect(placeDetail(named)).toBe('Garaje · 3 pisos · Palermo')
    expect(plain.title).toBe('Córdoba 5640')
    expect(placeDetail(plain)).toBe('Garaje · Chacarita')
  })

  it('playas de la Ciudad', () => {
    const [lot] = parkingPlaces({ lots: [{ id: 'pc21', lat: -34.58, lon: -58.42, name: 'Plaza Italia', address: 'Av. Sarmiento 2645', underground: true }] })
    expect(lot.title).toBe('Plaza Italia')
    expect(placeDetail(lot)).toBe('Playa subterránea · Av. Sarmiento 2645')
  })

  it('ordena por cercania', () => {
    const near = nearestPlaces(places, { latitude: -34.6045, longitude: -58.3781 }, 2)
    expect(near.map((p) => p.id)).toEqual(['mc2', 'mc1'])
    expect(near[0].meters).toBeLessThan(20)
    expect(nearestPlaces(places, null)).toEqual([])
  })

  it('formatea distancias y detalles', () => {
    expect(formatDistance(83)).toBe('a 80 m')
    expect(formatDistance(1234)).toBe('a 1,2 km')
    expect(placeDetail(places[0])).toBe('30 lugares · bajo techo · solo motos')
    expect(placeDetail(places[1])).toBe('50 lugares · a cielo abierto')
    expect(placeDetail(places[2])).toBe('Entre B. Mitre y Perón · sobre la vereda')
  })

  it('totales', () => {
    expect(parkingTotals(places)).toEqual({ cars: 0, lots: 0, garages: 2, garageSpots: 80, streetBlocks: 1 })
  })
})
