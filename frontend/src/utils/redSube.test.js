import { describe, expect, it } from 'vitest'
import { payPercent, simulateRedSube } from './redSube.js'

describe('payPercent', () => {
  it('50% el segundo, 75% de descuento del tercero al quinto', () => {
    expect([1, 2, 3, 4, 5, 6].map(payPercent)).toEqual([100, 50, 25, 25, 25, 100])
  })
})

describe('simulateRedSube', () => {
  it('aplica los descuentos y la excepcion de subte despues de tren', () => {
    const result = simulateRedSube([
      { mode: 'COLECTIVO', price: 1000 },
      { mode: 'TREN', price: 400 },
      { mode: 'SUBTE', price: 1200 },
    ])
    expect(result.detail.map((d) => d.paid)).toEqual([1000, 200, 1200])
    expect(result.detail[2].excluded).toBe(true)
    expect(result.total).toBe(2400)
    expect(result.full).toBe(2600)
  })
})
