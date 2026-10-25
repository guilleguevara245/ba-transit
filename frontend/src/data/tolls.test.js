import { describe, expect, it } from 'vitest'
import { TOLLS, formatToll } from './tolls.js'

describe('peajes', () => {
  it('cada acceso tiene fecha, fuente y valores no pico <= pico', () => {
    for (const toll of Object.values(TOLLS)) {
      expect(/^\d{4}-\d{2}-\d{2}$/.test(toll.since)).toBe(true)
      expect(toll.source.startsWith('https://')).toBe(true)
      for (const plaza of toll.plazas) {
        expect(plaza.telepase[0] <= plaza.telepase[1]).toBe(true)
        expect(plaza.manual[0] <= plaza.manual[1]).toBe(true)
      }
    }
  })

  it('redondea al peso', () => {
    expect(formatToll(994.15)).toMatch(/^\$994$/)
  })
})
