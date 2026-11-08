import { describe, expect, it } from 'vitest'
import { SOURCE_GROUPS, whenLabel } from './sources.js'

describe('whenLabel', () => {
  it('nombra cada cuanto se actualiza', () => {
    expect(whenLabel('live')).toBe('En vivo')
    expect(whenLabel('manual')).toBe('A mano')
    expect(whenLabel({ every: '15 min' })).toBe('Cada 15 min')
  })

  it('sin dato no hay etiqueta', () => {
    expect(whenLabel(null)).toBeNull()
    expect(whenLabel('otro')).toBeNull()
    expect(whenLabel({})).toBeNull()
  })
})

describe('SOURCE_GROUPS', () => {
  it('cada fuente tiene enlace, detalle y una etiqueta conocida', () => {
    for (const group of SOURCE_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0)
      for (const item of group.items) {
        expect(item.url).toMatch(/^https?:\/\//)
        expect(item.detail.length).toBeGreaterThan(0)
        if (item.when) expect(whenLabel(item.when)).not.toBeNull()
      }
    }
  })

  it('los temas no se repiten (sirven de ancla en la pagina)', () => {
    const ids = SOURCE_GROUPS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    const reserved = ['que-es', 'fuentes', 'fotos', 'aviso']
    expect(ids.some((id) => reserved.includes(id))).toBe(false)
  })
})
