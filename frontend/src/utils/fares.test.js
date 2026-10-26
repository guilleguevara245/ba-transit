import { describe, expect, it } from 'vitest'
import { basePrices, fareLabel, fareSummary, groupFares, tierLabel } from './fares.js'

const FARES = [
  { id: 1, mode: 'TREN', minKm: 12, maxKm: 24, section: 2, price: 640, priceUnregistered: 1280 },
  { id: 2, mode: 'TREN', minKm: 0, maxKm: 12, section: 1, price: 450, priceUnregistered: 900 },
  { id: 3, mode: 'SUBTE', tripsFrom: 21, tripsTo: 30, price: 1453.6 },
  { id: 4, mode: 'SUBTE', tripsFrom: 1, tripsTo: 20, price: 1817 },
  { id: 5, mode: 'SUBTE', tripsFrom: 41, tripsTo: null, price: 1090.2 },
  { id: 6, mode: 'COLECTIVO', jurisdiction: 'PROVINCIA', minKm: 0, maxKm: 3, price: 1215.09 },
  { id: 7, mode: 'COLECTIVO', jurisdiction: 'CABA', minKm: 0, maxKm: 3, price: 920.48 },
  { id: 8, mode: 'COLECTIVO', jurisdiction: 'NACIONAL', minKm: 3, maxKm: 6, price: 861.66 },
  { id: 9, mode: 'COLECTIVO', jurisdiction: 'NACIONAL', minKm: 0, maxKm: 3, price: 742.81 },
  { id: 10, mode: 'PREMETRO', price: 635.95, priceUnregistered: 883.97 },
]

describe('fareLabel', () => {
  it('tarifa plana', () => {
    expect(fareLabel({ mode: 'SUBTE', minKm: null, maxKm: null })).toBe('Subte, tarifa plana')
  })

  it('tramo con techo', () => {
    expect(fareLabel({ mode: 'COLECTIVO', minKm: 0, maxKm: 3 })).toBe('Colectivo, 0-3 km')
  })

  it('tramo abierto', () => {
    expect(fareLabel({ mode: 'TREN', minKm: 24, maxKm: null })).toBe('Tren, más de 24 km')
  })

  it('incluye jurisdiccion, seccion y viajes', () => {
    expect(fareLabel({ mode: 'COLECTIVO', jurisdiction: 'CABA', minKm: 0, maxKm: 3 })).toBe(
      'Colectivo Ciudad (CABA), 0-3 km',
    )
    expect(fareLabel({ mode: 'TREN', section: 1, minKm: 0, maxKm: 12 })).toBe('Tren, Sección 1 · 0-12 km')
    expect(fareLabel({ mode: 'SUBTE', tripsFrom: 41, tripsTo: null })).toBe('Subte, 41 viajes o más')
  })
})

describe('tierLabel', () => {
  it('rango de viajes del subte', () => {
    expect(tierLabel({ tripsFrom: 1, tripsTo: 20 })).toBe('1 a 20 viajes')
  })

  it('tarifa unica', () => {
    expect(tierLabel({ mode: 'PREMETRO' })).toBe('Tarifa única')
  })
})

describe('groupFares', () => {
  it('agrupa colectivos por jurisdiccion y ordena tramos', () => {
    const groups = groupFares(FARES)
    expect(groups.map((g) => g.key)).toEqual([
      'COLECTIVO:NACIONAL',
      'COLECTIVO:CABA',
      'COLECTIVO:PROVINCIA',
      'SUBTE',
      'PREMETRO',
      'TREN',
    ])
    expect(groups[0].rows.map((f) => f.id)).toEqual([9, 8])
    expect(groups[3].rows.map((f) => f.id)).toEqual([4, 3, 5])
    expect(groups[5].rows.map((f) => f.id)).toEqual([2, 1])
  })
})

describe('basePrices', () => {
  it('usa subte 1-20, tren seccion 1 y colectivo nacional del primer tramo', () => {
    expect(basePrices(FARES)).toEqual({ COLECTIVO: 742.81, SUBTE: 1817, TREN: 450, PREMETRO: 635.95 })
  })

  it('sin tarifas devuelve vacio', () => {
    expect(basePrices(null)).toEqual({})
  })
})

describe('fareSummary', () => {
  it('una fila por modo', () => {
    const summary = fareSummary(FARES)
    expect(summary.map((s) => s.mode)).toEqual(['COLECTIVO', 'SUBTE', 'PREMETRO', 'TREN'])
    expect(summary[0]).toMatchObject({ price: 742.81, from: true })
    expect(summary[1]).toMatchObject({ price: 1817, from: false })
    expect(summary[2]).toMatchObject({ price: 635.95, from: false, hint: null })
  })
})
