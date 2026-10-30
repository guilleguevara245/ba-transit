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
    expect(toSearchOptions(null, [])).toEqual([])
  })

  it('suma los colectivos: primero si se busco un numero', () => {
    const results = { lines: [{ id: 1, name: 'Línea A', mode: 'SUBTE', colorHex: '#00A8E1' }], stations: [] }
    const buses = [
      { id: '283', shortName: '203A', longName: 'JNAMBA203', agency: 'Empresa X', color: null },
      { id: '284', shortName: '203B', longName: 'Retiro - Moreno', agency: 'Empresa X', color: '#123456' },
    ]
    const byNumber = toSearchOptions(results, buses, '203')
    expect(byNumber.map((o) => o.group)).toEqual(['Colectivos', 'Colectivos', 'Líneas'])
    expect(byNumber[0]).toMatchObject({
      name: 'Línea 203 · Cartel A',
      meta: 'Empresa X',
      color: '#17171a',
      href: '/colectivos?linea=203A&id=283',
    })
    expect(byNumber[1].meta).toBe('Retiro - Moreno')
    expect(toSearchOptions(results, buses, 'línea a').map((o) => o.group)).toEqual(['Líneas', 'Colectivos', 'Colectivos'])
    expect(toSearchOptions(null, buses, '203')).toHaveLength(2)
  })

  it('como mucho MAX_BUSES colectivos', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: String(i), shortName: `60${i}` }))
    expect(toSearchOptions({ lines: [], stations: [] }, many, '60')).toHaveLength(6)
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
