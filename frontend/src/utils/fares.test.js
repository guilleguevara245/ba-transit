import { describe, expect, it } from 'vitest'
import { fareLabel } from './fares.js'

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
})
