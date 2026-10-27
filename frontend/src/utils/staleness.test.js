import { describe, expect, it } from 'vitest'
import { isStale } from './staleness.js'

describe('isStale', () => {
  it('avisa recien despues de unos 4 meses sin revisar', () => {
    expect(isStale('tarifas', new Date('2026-11-30T12:00:00-03:00'))).toBe(false)
    expect(isStale('tarifas', new Date('2027-03-15T12:00:00-03:00'))).toBe(true)
    expect(isStale('desconocido', new Date('2030-01-01T12:00:00-03:00'))).toBe(false)
  })
})
