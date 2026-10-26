import { describe, expect, it } from 'vitest'
import { alertTitle, periodText, untilText } from './weatherAlerts.js'

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
