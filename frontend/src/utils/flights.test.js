import { describe, expect, it } from 'vitest'
import {
  airlineFor,
  flightGroup,
  flightStatus,
  flightTitle,
  formatAltitude,
  formatSpeed,
  movingNow,
  parseOpenSky,
} from './flights.js'

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

describe('respaldo desde el navegador', () => {
  // Respuesta real de OpenSky (29/10/2026, 17:41), recortada; la misma que usa el test del backend.
  const body = {
    time: 1793306475,
    states: [
      ['e0b198', 'JES3331 ', 'Argentina', 1793306164, 1793306164, -58.4136, -34.5573, null, true, 0, 33.75, null, null, null, '2034', false, 0],
      ['a88cde', 'N650BL  ', 'United States', 1793306475, 1793306475, -58.8676, -34.705, 3055.62, false, 142.08, 24.15, -5.2, null, 3147.06, '1716', false, 0],
      ['e06541', 'ARG1477 ', 'Argentina', 1793306474, 1793306474, -58.5253, -34.498, 571.5, false, 74.77, 124.35, -3.25, null, 624.84, '2361', false, 0],
      ['345109', 'IBE5107 ', 'Spain', 1793306473, 1793306473, -58.6027, -34.8103, 251.46, false, 73.05, 101.78, -3.9, null, 304.8, '2376', false, 0],
      ['dead00', 'OLD1    ', 'Argentina', 1793300000, 1793300000, -58.5, -34.6, 1000, false, 80, 90, 0, null, 1000, null, false, 0],
      ['dead01', null, 'Argentina', null, 1793306475, null, null, null, false, null, null, null, null, null, null, false, 0],
    ],
  }

  it('clasifica igual que el servidor', () => {
    const flights = parseOpenSky(body)
    expect(flights.map((f) => f.callsign)).toEqual(['ARG1477', 'IBE5107', 'JES3331', 'N650BL'])
    const iberia = flights[1]
    expect(iberia).toMatchObject({ phase: 'LANDING', airport: 'EZE', airline: 'Iberia', altitude: 305, speed: 263 })
    expect(flights[2]).toMatchObject({ phase: 'GROUND', airport: 'AEP', altitude: null })
    expect(flights[3]).toMatchObject({ phase: 'CRUISE', airline: null })
  })

  it('aerolinea solo con indicativo de vuelo', () => {
    expect(airlineFor('FBZ5020')).toBe('Flybondi')
    expect(airlineFor('LVS100')).toBe(null)
  })
})
