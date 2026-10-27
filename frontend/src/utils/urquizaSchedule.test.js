import { describe, expect, it } from 'vitest'
import { urquizaDayType, urquizaNextTrains, urquizaStationIndex } from './urquizaSchedule.js'

describe('urquizaSchedule', () => {
  it('encuentra las estaciones sin importar tildes ni mayusculas', () => {
    expect(urquizaStationIndex('Federico Lacroze')).toBe(0)
    expect(urquizaStationIndex('tropezon')).toBe(9)
    expect(urquizaStationIndex('General Lemos')).toBe(22)
    expect(urquizaStationIndex('Retiro')).toBe(-1)
  })

  it('tipo de dia: habiles, sabados y domingos o feriados', () => {
    expect(urquizaDayType(new Date('2026-10-26T12:00:00-03:00'))).toBe('HABIL')
    expect(urquizaDayType(new Date('2026-10-24T12:00:00-03:00'))).toBe('SABADO')
    expect(urquizaDayType(new Date('2026-11-23T12:00:00-03:00'))).toBe('DOMINGO') // feriado
  })

  it('lunes 8:00 en Lacroze: salen hacia Lemos cada pocos minutos', () => {
    const result = urquizaNextTrains('Federico Lacroze', new Date('2026-10-26T08:00:00-03:00'))
    expect(result.directions.map((d) => d.towards)).toEqual(['General Lemos'])
    // Salidas 8:07, 8:17, 8:27 segun el PDF.
    expect(result.directions[0].arrivals.map((a) => a.minutes)).toEqual([7, 17, 27])
  })

  it('de noche muestra la hora del proximo tren nocturno', () => {
    // Lunes 23:55 en Lacroze: el ultimo de las 23:50 ya salio; el siguiente es el de la 1:00.
    const result = urquizaNextTrains('Federico Lacroze', new Date('2026-10-26T23:55:00-03:00'))
    expect(result.directions[0].label).toBe('Próximo tren 1:00')
  })

  it('en una cabecera intermedia muestra los dos sentidos', () => {
    const result = urquizaNextTrains('Devoto', new Date('2026-10-26T12:00:00-03:00'))
    expect(result.directions.map((d) => d.towards)).toEqual(['General Lemos', 'Federico Lacroze'])
  })
})
