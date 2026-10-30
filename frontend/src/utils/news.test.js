import { describe, expect, it } from 'vitest'
import { newsCounts } from './news.js'

describe('newsCounts', () => {
  it('cuenta por tema e ignora temas desconocidos', () => {
    const items = [{ category: 'SUBTE' }, { category: 'SUBTE' }, { category: 'TRENES' }, { category: 'OTRO' }]
    expect(newsCounts(items)).toEqual({ SUBTE: 2, TRENES: 1, COLECTIVOS: 0, GENERAL: 0 })
    expect(newsCounts(undefined)).toEqual({ SUBTE: 0, TRENES: 0, COLECTIVOS: 0, GENERAL: 0 })
  })
})
