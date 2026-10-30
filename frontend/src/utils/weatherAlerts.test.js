import { describe, expect, it } from 'vitest'
import { alertTitle, alertsForPlaces, dismissKey, periodText, travelTip, untilText } from './weatherAlerts.js'

describe('alertTitle', () => {
  it('arma el titulo con nivel y fenomeno', () => {
    expect(alertTitle({ level: 'NARANJA', kind: 'CALOR' })).toBe('Alerta naranja por calor extremo')
    expect(alertTitle({ level: 'AMARILLA', kind: 'OTRO', title: 'Alerta por niebla' })).toBe('Alerta por niebla')
    expect(alertTitle({ level: 'ROJA', kind: 'TORMENTAS' }, false)).toBe('Alerta por tormentas')
  })
})

describe('untilText', () => {
  const now = new Date('2026-10-25T22:00:00-03:00')
  it('hoy, mañana u otro dia', () => {
    expect(untilText('2026-10-25T23:30:00-03:00', now)).toBe('hasta las 23:30')
    expect(untilText('2026-10-26T06:00:00-03:00', now)).toBe('hasta mañana a las 06:00')
    expect(untilText('2026-10-28T09:00:00-03:00', now)).toBe('hasta el miércoles a las 09:00')
    expect(untilText(null, now)).toBeNull()
  })
})

describe('periodText', () => {
  const now = new Date('2026-10-25T22:00:00-03:00')
  it('si todavia no empezo dice desde cuando', () => {
    // Datos de la alerta real del SMN del 25/10/2026.
    expect(periodText({ onset: '2026-10-26T21:00:00-03:00', expires: '2026-10-27T02:59:59-03:00' }, now)).toBe(
      'desde mañana a las 21:00 hasta el martes a las 02:59',
    )
    expect(periodText({ onset: '2026-10-25T18:00:00-03:00', expires: '2026-10-26T06:00:00-03:00' }, now)).toBe(
      'hasta mañana a las 06:00',
    )
  })
})

describe('travelTip', () => {
  const now = new Date('2026-10-25T22:00:00-03:00')
  it('adapta el consejo al tipo y al dia', () => {
    expect(travelTip({ kind: 'TORMENTAS', onset: '2026-10-26T21:00:00-03:00' }, now)).toBe(
      'Si viajás mañana, llevá paraguas y salí con tiempo: puede haber demoras.',
    )
    expect(travelTip({ kind: 'CALOR', onset: '2026-10-25T10:00:00-03:00' }, now)).toMatch(
      /^Si vas a viajar, llevá agua/,
    )
    expect(travelTip({ kind: 'OTRO' }, now)).toBeNull()
  })
})

describe('dismissKey', () => {
  const now = new Date('2026-10-30T21:30:00Z') // 18:30 en Buenos Aires
  it('una renovacion del SMN (otro id, otro horario) se recuerda como cerrada', () => {
    const before = { id: 'a1', kind: 'TORMENTAS', level: 'NARANJA' }
    const renewed = { id: 'a2', kind: 'TORMENTAS', level: 'NARANJA' }
    expect(dismissKey(renewed, now)).toBe(dismissKey(before, now))
  })
  it('si sube de nivel o es otro dia, vuelve a aparecer', () => {
    const naranja = { kind: 'TORMENTAS', level: 'NARANJA' }
    const roja = { kind: 'TORMENTAS', level: 'ROJA' }
    expect(dismissKey(roja, now) === dismissKey(naranja, now)).toBe(false)
    expect(dismissKey(naranja, new Date('2026-10-31T12:00:00Z')) === dismissKey(naranja, now)).toBe(false)
  })
})

describe('alertsForPlaces', () => {
  const casa = { label: 'Casa' }
  const trabajo = { label: 'Trabajo' }
  const naranja = { id: 'n', kind: 'TORMENTAS', level: 'NARANJA' }
  const amarilla = { id: 'a', kind: 'TORMENTAS', level: 'AMARILLA' }
  const calor = { id: 'c', kind: 'CALOR', level: 'AMARILLA' }

  it('con un solo lugar no dice donde', () => {
    expect(alertsForPlaces([{ place: casa, alerts: [naranja] }])).toEqual([{ ...naranja, where: null }])
  })

  it('una por tipo, la de mayor nivel, con el lugar al que afecta', () => {
    const result = alertsForPlaces([
      { place: casa, alerts: [amarilla, calor] },
      { place: trabajo, alerts: [naranja, calor] },
    ])
    expect(result).toEqual([
      { ...naranja, where: 'Trabajo' },
      { ...calor, where: null },
    ])
  })
})
