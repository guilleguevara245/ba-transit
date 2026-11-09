import { describe, expect, it } from 'vitest'
import { displacement, positionAt } from './cruise.js'
import { easeInOut, lerpPoint, roughKm } from './glide.js'

describe('glide', () => {
  it('easeInOut arranca en 0, pasa por la mitad y termina en 1', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(0.5)).toBe(0.5)
    expect(easeInOut(1)).toBe(1)
  })

  it('lerpPoint da el punto intermedio', () => {
    expect(lerpPoint([0, 0], [2, 4], 0.5)).toEqual([1, 2])
  })

  it('roughKm: un grado de latitud son unos 111 km', () => {
    expect(roughKm([-34.6, -58.4], [-33.6, -58.4])).toBeCloseTo(111.32, 1)
  })
})

describe('cruise', () => {
  it('displacement: 10 km hacia el norte suben la latitud', () => {
    const [lat, lon] = displacement([-34.6, -58.4], 0, 10)
    expect(lat).toBeCloseTo(-34.6 + 10 / 111.32, 5)
    expect(lon).toBeCloseTo(-58.4, 5)
  })

  it('positionAt: un avion a 360 km/h avanza 1 km en 10 segundos', () => {
    const state = { base: [-34.6, -58.4], heading: 90, speed: 360, start: 0, offset: [0, 0] }
    const [lat, lon] = positionAt(state, 10_000)
    expect(lat).toBeCloseTo(-34.6, 5)
    expect(roughKm([-34.6, -58.4], [lat, lon])).toBeCloseTo(1, 2)
  })

  it('positionAt: quieto, solo se acomoda desde donde se lo mostraba', () => {
    const state = { base: [0, 0], heading: 0, speed: 0, start: 0, offset: [1, 1] }
    expect(positionAt(state, 0)).toEqual([1, 1])
    expect(positionAt(state, 5_000)).toEqual([0, 0])
  })
})
