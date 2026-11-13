import { describe, expect, it } from 'vitest'
import { branchName, positionAge } from './liveTrains.js'

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
