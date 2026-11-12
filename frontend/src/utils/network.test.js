import { describe, expect, it } from 'vitest'
import { statusFor, summarizeByMode, worstAlertType } from './network.js'

const lines = [
  { id: 1, mode: 'SUBTE' },
  { id: 2, mode: 'SUBTE' },
  { id: 3, mode: 'TREN' },
]

describe('summarizeByMode', () => {
  it('cuenta lineas por modo aunque no haya alertas', () => {
    const summary = summarizeByMode(lines, [])

    expect(summary.get('SUBTE')).toEqual({ lineCount: 2, alertCount: 0, worstType: null, groups: [] })
    expect(summary.get('TREN')).toEqual({ lineCount: 1, alertCount: 0, worstType: null, groups: [] })
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
    // Cada linea en el grupo de su peor alerta: la 2 en interrupciones, la 1 en demoras.
    expect(subte.groups).toEqual([
      { type: 'INTERRUPCION', lineIds: [2] },
      { type: 'DEMORA', lineIds: [1] },
    ])
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
    expect(statusFor('OBRA')).toEqual({ label: 'Obras', className: 'status-delayed' })
    expect(statusFor('DESVIO')).toEqual({ label: 'Desvíos', className: 'status-delayed' })
    expect(statusFor('INTERRUPCION').className).toBe('status-interrupted')
    expect(statusFor('OTRO').label).toBe('Alertas activas')
    expect(statusFor(null).label).toBe('Normal')
  })
})

describe('worstAlertType', () => {
  it('devuelve el tipo mas grave o null', () => {
    expect(worstAlertType([{ type: 'OBRA' }, { type: 'INTERRUPCION' }, { type: 'DEMORA' }])).toBe('INTERRUPCION')
    expect(worstAlertType([])).toBe(null)
  })
})
