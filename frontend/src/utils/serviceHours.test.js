import { describe, expect, it } from 'vitest'
import { serviceHoursFor } from './serviceHours.js'

describe('serviceHoursFor', () => {
  it('devuelve primer y ultimos trenes del subte', () => {
    const hours = serviceHoursFor({ mode: 'SUBTE', code: 'D' })

    expect(hours.firstTrain).toEqual(['5:30', '6:00', '8:00'])
    expect(hours.lastTrains[1]).toEqual({ from: 'Catedral', times: ['23:32', '00:01', '22:31'] })
  })

  it('incluye la nota del servicio nocturno de la B', () => {
    expect(serviceHoursFor({ mode: 'SUBTE', code: 'B' }).note).toMatch(/1:30/)
  })

  it('los trenes no tienen horario cargado', () => {
    expect(serviceHoursFor({ mode: 'TREN', code: 'MITRE' })).toBe(null)
  })
})
