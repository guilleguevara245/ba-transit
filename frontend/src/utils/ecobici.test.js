import { describe, expect, it } from 'vitest'
import { availability, normalizeText, stationLabel } from './ecobici.js'

describe('stationLabel', () => {
  it('saca el numero del principio', () => {
    expect(stationLabel('002 - Retiro I')).toBe('Retiro I')
    expect(stationLabel('Plaza Italia')).toBe('Plaza Italia')
  })
})

describe('availability', () => {
  it('clasifica segun las bicis disponibles', () => {
    expect(availability({ renting: true, bikes: 0 }).key).toBe('empty')
    expect(availability({ renting: true, bikes: 2 }).key).toBe('low')
    expect(availability({ renting: true, bikes: 9 }).key).toBe('ok')
    expect(availability({ renting: false, bikes: 9 }).key).toBe('off')
  })
})

describe('normalizeText', () => {
  it('ignora tildes y mayusculas', () => {
    expect(normalizeText('Plaza Itália')).toBe('plaza italia')
  })
})
