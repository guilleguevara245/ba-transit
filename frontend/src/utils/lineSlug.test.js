import { describe, expect, it } from 'vitest'
import { findLine, linePath, lineSlug } from './lineSlug.js'

const LINES = [
  { id: 2, mode: 'SUBTE', code: 'B' },
  { id: 7, mode: 'PREMETRO', code: 'P' },
  { id: 10, mode: 'TREN', code: 'SAN_MARTIN' },
]

describe('lineSlug', () => {
  it('subte, premetro y trenes', () => {
    expect(lineSlug(LINES[0])).toBe('subte-b')
    expect(lineSlug(LINES[1])).toBe('premetro')
    expect(lineSlug(LINES[2])).toBe('san-martin')
    expect(lineSlug({ mode: 'TREN', code: 'TREN_DE_LA_COSTA' })).toBe('tren-de-la-costa')
  })

  it('sin codigo usa el id', () => {
    expect(linePath({ id: 10 })).toBe('/lineas/10')
    expect(linePath(LINES[2])).toBe('/lineas/san-martin')
  })

  it('encuentra la linea por slug o por id (links viejos)', () => {
    expect(findLine(LINES, 'san-martin').id).toBe(10)
    expect(findLine(LINES, '10').id).toBe(10)
    expect(findLine(LINES, 'subte-z')).toBe(null)
  })
})
