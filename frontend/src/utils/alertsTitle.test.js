import { describe, expect, it } from 'vitest'
import { favoriteAlertCount, titleWithAlerts } from './alertsTitle.js'

describe('titleWithAlerts', () => {
  it('muestra la cantidad solo si hay alertas', () => {
    expect(titleWithAlerts(3)).toBe('(3) BA Transit')
    expect(titleWithAlerts(0)).toBe('BA Transit')
  })
})

describe('favoriteAlertCount', () => {
  const alerts = [
    { id: 1, transportLineId: 10 },
    { id: 2, transportLineId: 10 },
    { id: 3, transportLineId: 20 },
    { id: 4, transportLineId: 30 },
  ]

  it('cuenta solo las alertas de las lineas favoritas', () => {
    expect(favoriteAlertCount(alerts, [10])).toBe(2)
    expect(favoriteAlertCount(alerts, [10, 30])).toBe(3)
  })

  it('una linea repetida (favorita y por una estacion) no cuenta dos veces', () => {
    expect(favoriteAlertCount(alerts, [20, 20])).toBe(1)
  })

  it('sin favoritos no hay numero', () => {
    expect(favoriteAlertCount(alerts, [])).toBe(0)
  })
})
