import { describe, expect, it } from 'vitest'
import { flightGroup, flightStatus, flightTitle, formatAltitude, formatSpeed, movingNow } from './flights.js'

const iberia = { id: '345109', callsign: 'IBE5107', phase: 'LANDING', airport: 'EZE', altitude: 305, speed: 263 }

describe('aviones en vivo', () => {
  it('estado en palabras', () => {
    expect(flightStatus(iberia)).toBe('Aterrizando en Ezeiza')
    expect(flightStatus({ phase: 'DEPARTING', airport: 'AEP' })).toBe('Despegó de Aeroparque')
    expect(flightStatus({ phase: 'GROUND', airport: 'AEP' })).toBe('En tierra en Aeroparque')
    expect(flightStatus({ phase: 'GROUND', airport: null })).toBe('En tierra')
    expect(flightStatus({ phase: 'CRUISE', airport: null })).toBe('En vuelo')
  })

  it('grupos de la referencia', () => {
    expect(flightGroup(iberia)).toBe('arriving')
    expect(flightGroup({ phase: 'NEAR' })).toBe('air')
    expect(flightGroup({ phase: 'CRUISE' })).toBe('air')
  })

  it('formatos', () => {
    expect(formatAltitude(3147)).toBe('3.150 m')
    expect(formatAltitude(null)).toBe(null)
    expect(formatSpeed(263)).toBe('263 km/h')
    expect(flightTitle(iberia)).toBe('IBE5107')
    expect(flightTitle({ id: 'e80461', callsign: null })).toBe('Avión E80461')
  })

  it('solo los que llegan o salen', () => {
    expect(movingNow([iberia, { phase: 'GROUND' }, { phase: 'DEPARTING' }])).toHaveLength(2)
  })
})
