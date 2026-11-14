import { describe, expect, it } from 'vitest'
import { stopTimes } from './busTrip.js'

const minutes = [0, 2, 5, 9, null, 15]

describe('stopTimes', () => {
  it('sin nada elegido, desde la cabecera', () => {
    const { rows, trip } = stopTimes(minutes)
    expect(rows.map((r) => r.minutes)).toEqual([null, 2, 5, 9, null, 15])
    expect(rows.every((r) => r.state === 'normal')).toBe(true)
    expect(trip).toBeNull()
  })

  it('desde la parada elegida: las de antes sin tiempo', () => {
    const { rows } = stopTimes(minutes, 6, 2)
    expect(rows.map((r) => r.state)).toEqual(['before', 'before', 'from', 'normal', 'normal', 'normal'])
    expect(rows.map((r) => r.minutes)).toEqual([null, null, null, 4, null, 10])
  })

  it('de una parada a otra: el viaje y lo que tarda', () => {
    const { rows, trip } = stopTimes(minutes, 6, 1, 3)
    expect(rows.map((r) => r.state)).toEqual(['before', 'from', 'ride', 'to', 'after', 'after'])
    expect(trip).toEqual({ from: 1, to: 3, stops: 2, minutes: 7 })
  })

  it('solo donde bajas: desde la cabecera', () => {
    const { trip } = stopTimes(minutes, 6, null, 5)
    expect(trip).toEqual({ from: 0, to: 5, stops: 5, minutes: 15 })
  })

  it('sin minutos en la parada, sin tiempos pero con el viaje en paradas', () => {
    const { rows, trip } = stopTimes(minutes, 6, 4, 5)
    expect(rows[5].minutes).toBeNull()
    expect(trip).toEqual({ from: 4, to: 5, stops: 1, minutes: null })
  })
})
