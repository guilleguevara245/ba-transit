import { describe, expect, it } from 'vitest'
import { speedPercent, trafficStatus, worstStatus } from './traffic.js'

describe('trafficStatus', () => {
  it('traduce los codigos y cae en "Sin datos" si no lo conoce', () => {
    expect(trafficStatus('DEMORADO').label).toBe('Demorado')
    expect(trafficStatus('OTRO').label).toBe('Sin datos')
  })
})

describe('speedPercent', () => {
  it('calcula el porcentaje de la velocidad libre', () => {
    expect(speedPercent({ currentSpeed: 45, freeFlowSpeed: 90 })).toBe(50)
    expect(speedPercent({ currentSpeed: 120, freeFlowSpeed: 100 })).toBe(100)
    expect(speedPercent({ currentSpeed: null, freeFlowSpeed: 90 })).toBeNull()
    expect(speedPercent({ currentSpeed: 10, freeFlowSpeed: 0 })).toBeNull()
  })
})

describe('worstStatus', () => {
  it('toma el peor tramo con datos', () => {
    expect(worstStatus([{ status: 'FLUIDO' }, { status: 'CONGESTIONADO' }])).toBe('CONGESTIONADO')
    expect(worstStatus([{ status: 'SIN_DATOS' }, { status: 'DEMORADO' }])).toBe('DEMORADO')
    expect(worstStatus([{ status: 'SIN_DATOS' }])).toBe('SIN_DATOS')
  })
})
