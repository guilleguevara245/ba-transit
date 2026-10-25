import { describe, expect, it } from 'vitest'
import { titleWithAlerts } from './useAlertsTitle.js'

describe('titleWithAlerts', () => {
  it('muestra la cantidad solo si hay alertas', () => {
    expect(titleWithAlerts(3)).toBe('(3) BA Transit')
    expect(titleWithAlerts(0)).toBe('BA Transit')
  })
})
