import { describe, expect, it } from 'vitest'
import { cleanClock } from './clockPrefs.js'

describe('cleanClock', () => {
  it('valida y completa con los valores por defecto', () => {
    expect(cleanClock({ formato: '12', fecha: 'corta' })).toEqual({ formato: '12', fecha: 'corta' })
    expect(cleanClock({ formato: '12' })).toEqual({ formato: '12', fecha: 'larga' })
    expect(cleanClock({ formato: '13', fecha: 'sin' })).toEqual({ formato: '24', fecha: 'sin' })
    expect(cleanClock({ formato: 'x', fecha: 'y' })).toBeNull()
    expect(cleanClock(null)).toBeNull()
  })
})
