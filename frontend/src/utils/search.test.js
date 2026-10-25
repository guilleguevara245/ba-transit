import { describe, expect, it } from 'vitest'
import { moveActiveIndex, toSearchOptions } from './search.js'

describe('toSearchOptions', () => {
  it('lineas primero, despues estaciones, con su destino', () => {
    const options = toSearchOptions({
      lines: [{ id: 1, name: 'Línea A', mode: 'SUBTE', colorHex: '#00A8E1' }],
      stations: [{ stationId: 5, stationName: 'Perú', lineId: 1, lineName: 'Línea A', lineColorHex: '#00A8E1' }],
    })

    expect(options.map((o) => o.href)).toEqual(['/lineas/1', '/lineas/1?estacion=5'])
    expect(options[0].meta).toBe('Subte')
    expect(options[1].group).toBe('Estaciones')
  })

  it('sin resultados devuelve lista vacia', () => {
    expect(toSearchOptions(null)).toEqual([])
  })
})

describe('moveActiveIndex', () => {
  it('baja, sube y da la vuelta', () => {
    expect(moveActiveIndex(-1, 1, 3)).toBe(0)
    expect(moveActiveIndex(-1, -1, 3)).toBe(2)
    expect(moveActiveIndex(2, 1, 3)).toBe(0)
    expect(moveActiveIndex(0, -1, 3)).toBe(2)
    expect(moveActiveIndex(0, 1, 0)).toBe(-1)
  })
})
