import { describe, expect, it } from 'vitest'
import { cleanName, greetingFor } from './greeting.js'

// Horas en UTC: Buenos Aires es UTC-3.
const at = (hourUtc) => new Date(Date.UTC(2026, 9, 25, hourUtc, 30))

describe('greetingFor', () => {
  it('saluda segun la hora de Buenos Aires', () => {
    expect(greetingFor(at(9))).toBe('Buenos días') // 6:30
    expect(greetingFor(at(15))).toBe('Buenos días') // 12:30
    expect(greetingFor(at(16))).toBe('Buenas tardes') // 13:30
    expect(greetingFor(at(22))).toBe('Buenas tardes') // 19:30
    expect(greetingFor(at(23))).toBe('Buenas noches') // 20:30
    expect(greetingFor(at(7))).toBe('Buenas noches') // 4:30
  })
})

describe('cleanName', () => {
  it('limpia espacios y pone mayuscula', () => {
    expect(cleanName('  guille   ')).toBe('Guille')
    expect(cleanName('   ')).toBe('')
    expect(cleanName('x'.repeat(50))).toHaveLength(30)
  })
})
