import { describe, expect, it } from 'vitest'
import { tripStrip, tripTimeline } from './tripTimeline.js'

const station = (name, line, color) => ({ stationName: name, lineName: `Línea ${line}`, lineColorHex: color })
const ITU = station('Ituzaingó', 'Sarmiento', '#00a7e1')
const ONCE = station('Once', 'Sarmiento', '#00a7e1')
const ONCE_H = station('Once - 30 de Diciembre', 'H', '#ffd600')
const CORR = station('Corrientes', 'H', '#ffd600')
const HOME = { type: 'address', text: 'Martín Rodríguez 800', area: 'Ituzaingó', lat: -34.66, lon: -58.67 }

const LEGS = [
  { type: 'access', from: HOME, to: ITU, km: 0.62, minutes: 11 },
  { type: 'ride', from: ITU, to: ONCE, towards: ONCE, stops: 11, minutes: 45 },
  { type: 'walk', from: ONCE, to: ONCE_H, meters: 167, minutes: 6 },
  {
    type: 'ride',
    from: ONCE_H,
    to: CORR,
    towards: station('Facultad de Derecho', 'H', '#ffd600'),
    stops: 1,
    minutes: 1,
  },
]

describe('tripTimeline', () => {
  const items = tripTimeline(LEGS)
  const stops = items.filter((i) => i.type === 'stop')

  it('alterna paradas y tramos y termina con la llegada', () => {
    expect(items.map((i) => i.type)).toEqual([
      'stop',
      'segment',
      'stop',
      'segment',
      'stop',
      'segment',
      'stop',
      'segment',
      'stop',
    ])
    expect(stops.map((s) => s.at)).toEqual([0, 11, 56, 62, 63])
    expect(stops[4]).toMatchObject({ kind: 'end', name: 'Corrientes', text: 'Llegaste', in: '#ffd600', out: null })
  })

  it('sale de la direccion y dice donde subir y combinar', () => {
    expect(stops[0]).toMatchObject({
      kind: 'start',
      address: true,
      name: 'Martín Rodríguez 800',
      text: 'Ituzaingó',
      out: 'walk',
    })
    expect(stops[1].text).toBe('Tomá la Línea Sarmiento hacia Once')
    expect(stops[2]).toMatchObject({ text: 'Bajá y combiná con la Línea H', in: '#00a7e1', out: 'walk' })
    expect(stops[3]).toMatchObject({ name: 'Once - 30 de Diciembre', color: '#ffd600', in: 'walk' })
  })

  it('describe cada tramo', () => {
    const segments = items.filter((i) => i.type === 'segment').map((i) => i.text)
    expect(segments).toEqual([
      'Caminá unos 600 m hasta Ituzaingó · ≈ 11 min',
      '11 estaciones · ≈ 45 min',
      'Caminá unos 167 m hasta Once - 30 de Diciembre · ≈ 6 min con la espera',
      '1 estación · ≈ 1 min',
    ])
  })

  it('termina caminando hasta una direccion', () => {
    const legs = [
      { type: 'ride', from: ITU, to: ONCE, towards: ONCE, stops: 11, minutes: 45 },
      { type: 'egress', from: ONCE, to: HOME, km: 1.24, minutes: 21 },
    ]
    const list = tripTimeline(legs)
    expect(list[2]).toMatchObject({ name: 'Once', text: 'Bajá y seguí a pie', out: 'walk' })
    expect(list[3].text).toBe('Caminá unos 1,2 km · ≈ 21 min')
    expect(list[4]).toMatchObject({ kind: 'end', address: true, name: 'Martín Rodríguez 800', at: 66 })
  })

  it('sin tramos no hay linea de tiempo', () => {
    expect(tripTimeline([])).toEqual([])
  })
})

describe('tripStrip', () => {
  it('muestra a pie y las lineas, sin las combinaciones', () => {
    expect(tripStrip(LEGS).map((s) => (s.kind === 'line' ? s.station.lineName : 'a pie'))).toEqual([
      'a pie',
      'Línea Sarmiento',
      'Línea H',
    ])
  })
  it('no repite la linea en un cambio de ramal', () => {
    const legs = [
      { type: 'ride', from: ITU, to: ONCE, towards: ONCE, stops: 3, minutes: 9 },
      { type: 'branch', from: ONCE, to: ONCE, minutes: 4 },
      { type: 'ride', from: ONCE, to: ITU, towards: ITU, stops: 3, minutes: 9 },
    ]
    expect(tripStrip(legs)).toHaveLength(1)
    expect(tripTimeline(legs)[3]).toMatchObject({ track: 'wait', text: 'Esperá el tren del otro ramal · ≈ 4 min' })
  })
})
