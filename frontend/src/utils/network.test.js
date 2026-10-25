import { describe, expect, it } from 'vitest'
import { statusFor, summarizeByMode } from './network.js'

const lines = [
  { id: 1, mode: 'SUBTE' },
  { id: 2, mode: 'SUBTE' },
  { id: 3, mode: 'TREN' },
]

describe('summarizeByMode', () => {
  it('cuenta lineas por modo aunque no haya alertas', () => {
    const summary = summarizeByMode(lines, [])

    expect(summary.get('SUBTE')).toEqual({ lineCount: 2, alertCount: 0, worstType: null })
    expect(summary.get('TREN')).toEqual({ lineCount: 1, alertCount: 0, worstType: null })
  })

  it('se queda con la alerta mas grave de cada modo', () => {
    const alerts = [
      { transportLineId: 1, type: 'OBRA' },
      { transportLineId: 2, type: 'INTERRUPCION' },
      { transportLineId: 1, type: 'DEMORA' },
    ]

    const subte = summarizeByMode(lines, alerts).get('SUBTE')

    expect(subte.alertCount).toBe(3)
    expect(subte.worstType).toBe('INTERRUPCION')
  })

  it('ignora alertas de lineas desconocidas', () => {
    const summary = summarizeByMode(lines, [{ transportLineId: 99, type: 'DEMORA' }])

    expect(summary.get('SUBTE').alertCount).toBe(0)
  })
})

describe('statusFor', () => {
  it('traduce el peor tipo de alerta a un estado', () => {
    expect(statusFor('INTERRUPCION').label).toBe('Interrupciones')
    expect(statusFor('DEMORA').label).toBe('Demoras')
    expect(statusFor('OBRA').label).toBe('Alertas activas')
    expect(statusFor(null).label).toBe('Normal')
  })
})
