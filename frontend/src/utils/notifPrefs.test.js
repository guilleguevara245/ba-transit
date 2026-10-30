import { describe, expect, it } from 'vitest'
import { isPaused, pauseLabel, upgradePrefs } from './notifPrefs.js'

const DEFAULTS = { version: 3, kinds: ['lineas', 'estaciones', 'accesos', 'colectivos', 'clima'], quiet: true }
const NEW = { 2: ['clima'], 3: ['colectivos'] }

describe('upgradePrefs', () => {
  it('sin nada guardado usa los valores por defecto', () => {
    expect(upgradePrefs(null, DEFAULTS, NEW)).toEqual(DEFAULTS)
  })

  it('a lo guardado de antes le suma una vez los tipos de cada version que le falta', () => {
    const old = { kinds: ['lineas'], quiet: false }
    expect(upgradePrefs(old, DEFAULTS, NEW)).toEqual({ version: 3, kinds: ['lineas', 'clima', 'colectivos'], quiet: false })
  })

  it('de la version 2 solo suma lo de la 3 (si apagó el clima, sigue apagado)', () => {
    const v2 = { version: 2, kinds: ['lineas'] }
    expect(upgradePrefs(v2, DEFAULTS, NEW).kinds).toEqual(['lineas', 'colectivos'])
  })

  it('si ya es de esta version respeta lo que apagó', () => {
    const saved = { version: 3, kinds: ['lineas'] }
    expect(upgradePrefs(saved, DEFAULTS, NEW).kinds).toEqual(['lineas'])
  })
})

describe('pausa', () => {
  // Jueves 29/10/2026, 15:00 en Buenos Aires.
  const now = new Date('2026-10-29T18:00:00Z')

  it('isPaused mira la fecha', () => {
    expect(isPaused({ pausedUntil: null }, now)).toBe(false)
    expect(isPaused({ pausedUntil: '2026-10-29T19:00:00Z' }, now)).toBe(true)
    expect(isPaused({ pausedUntil: '2026-10-29T17:00:00Z' }, now)).toBe(false)
  })

  it('pauseLabel dice hasta cuando', () => {
    expect(pauseLabel('2026-10-29T19:00:00Z', now)).toBe('hasta las 16:00')
    expect(pauseLabel('2026-10-30T09:00:00Z', now)).toBe('hasta mañana a las 06:00')
    expect(pauseLabel('2026-11-02T09:00:00Z', now)).toBe('hasta el lunes a las 06:00')
  })
})
