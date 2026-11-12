import { describe, expect, it } from 'vitest'
import { trainText, tripStrip, tripTimeline, withTrains } from './tripTimeline.js'

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

describe('con los trenes de Trenes Argentinos', () => {
  const START = new Date('2026-11-12T18:00:00Z')
  const at = (min) => new Date(START.getTime() + min * 60_000).toISOString()
  const trip = (dep, arr, extra = {}) => ({ departure: at(dep), arrival: at(arr), scheduled: true, ...extra })

  it('toma el primer tren que se alcanza y sigue su horario', () => {
    // Se llega a Ituzaingó a los 11 min: el de los 9 ya se fue, el de los 14 cancelado; sale el de los 20.
    const trains = {
      1: [trip(9, 50), trip(14, 55, { cancelled: true }), trip(20, 62, { platform: '2', destination: 'Once' })],
    }
    const items = tripTimeline(LEGS, { trains, start: START })
    const stops = items.filter((i) => i.type === 'stop')
    // Ituzaingó a los 20 (con la espera), Once a los 62, la H 2 min caminando más su espera promedio.
    expect(stops.map((s) => Math.round(s.at))).toEqual([0, 20, 62, 68, 69])
    expect(stops[1].train).toMatchObject({ platform: '2' })
    expect(stops[1].towards).toBe('Once')
    const segments = items.filter((i) => i.type === 'segment').map((i) => i.text)
    expect(segments[0]).toBe('Caminá unos 600 m hasta Ituzaingó · ≈ 11 min y 9 min de espera')
    expect(segments[1]).toBe('11 estaciones · 42 min')
  })

  it('después de combinar a pie, cambia la espera promedio por la real', () => {
    const legs = [LEGS[1], { ...LEGS[2], to: station('Plaza Miserere', 'Sarmiento', '#00a7e1') }, { ...LEGS[1] }]
    // A Once se llega a los 45; caminando 2 min (6 menos la espera de 4) se está a los 47: sale a los 50.
    const { legs: timed, offset } = withTrains(legs, { 2: [trip(46, 60), trip(50, 70)] }, START)
    expect(offset).toBe(0)
    expect(timed[1].minutes).toBe(5)
    expect(timed[1].wait).toBe(3)
    expect(timed[2].minutes).toBe(20)
  })

  it('si el viaje empieza en el tren, arranca cuando sale', () => {
    const items = tripTimeline([LEGS[1]], { trains: { 0: [trip(7, 49)] }, start: START })
    expect(items[0].at).toBe(7)
    expect(items.at(-1).at).toBe(49)
  })

  it('sin trenes que se alcancen (o sin datos), queda la estimación', () => {
    expect(tripTimeline(LEGS, { trains: { 1: [trip(5, 40)] }, start: START }).at(-1).at).toBe(63)
    expect(tripTimeline(LEGS, { trains: {}, start: START }).at(-1).at).toBe(63)
    expect(tripTimeline(LEGS, { trains: { 1: null }, start: START }).at(-1).at).toBe(63)
  })

  it('nombra el tren con su hora, destino si cambia, andén y tipo', () => {
    const clock = (d) => `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`
    expect(trainText(trip(32, 50), 'Once', clock)).toBe('Tren de las 18:32 · según horario')
    expect(
      trainText(trip(32, 50, { destination: 'Victoria', platform: '2', service: 'Rápido', scheduled: false }), 'Tigre', clock),
    ).toBe('Tren de las 18:32 a Victoria · andén 2 · Rápido · en vivo')
  })
})
