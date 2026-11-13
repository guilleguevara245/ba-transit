import { describe, expect, it } from 'vitest'
import { branchName, positionAge, secondsAgoText, trainsMovingLabel } from './liveTrains.js'

describe('positionAge', () => {
  const now = new Date('2026-11-12T22:30:00Z')
  it('en segundos el primer minuto y despues como el resto del sitio', () => {
    expect(positionAge('2026-11-12T22:29:55Z', now)).toBe('recién')
    expect(positionAge('2026-11-12T22:29:40Z', now)).toBe('hace 20 s')
    expect(positionAge('2026-11-12T22:27:00Z', now)).toBe('hace 3 min')
    expect(positionAge(null, now)).toBeNull()
  })
})

describe('branchName', () => {
  it('separa las cabeceras con espacios', () => {
    expect(branchName('Retiro-Cabred')).toBe('Retiro - Cabred')
    expect(branchName('Once - Moreno')).toBe('Once - Moreno')
  })
})

describe('trainsMovingLabel', () => {
  it('dice que son trenes y que es en vivo', () => {
    expect(trainsMovingLabel(1)).toBe('1 tren en vivo')
    expect(trainsMovingLabel(5)).toBe('5 trenes en vivo')
  })
})

describe('secondsAgoText', () => {
  it('en segundos el primer minuto', () => {
    expect(secondsAgoText(4)).toBe('recién')
    expect(secondsAgoText(38)).toBe('hace 38 s')
    expect(secondsAgoText(130)).toBe('hace 2 min')
    expect(secondsAgoText(null)).toBeNull()
  })
})
