import { describe, expect, it } from 'vitest'
import { countByFilter, filterAlerts, sortByRecent } from './alertFilters.js'

const modes = { 1: 'TREN', 2: 'SUBTE', 3: 'PREMETRO' }
const modeOf = (a) => modes[a.transportLineId]
const alerts = [
  { id: 1, transportLineId: 1, publishedAt: '2026-10-26T10:00:00Z' },
  { id: 2, transportLineId: 2, publishedAt: '2026-10-26T12:00:00Z' },
  { id: 3, transportLineId: 1, publishedAt: '2026-10-26T11:00:00Z' },
  { id: 4, transportLineId: 1, publishedAt: null },
]

describe('alertFilters', () => {
  it('ordena de la mas reciente a la mas vieja', () => {
    expect(sortByRecent(alerts).map((a) => a.id)).toEqual([2, 3, 1, 4])
  })

  it('filtra por modo', () => {
    expect(filterAlerts(alerts, 'TODAS', modeOf)).toHaveLength(4)
    expect(filterAlerts(alerts, 'TREN', modeOf).map((a) => a.id)).toEqual([1, 3, 4])
    expect(filterAlerts(alerts, 'PREMETRO', modeOf)).toEqual([])
  })

  it('cuenta por filtro', () => {
    expect(countByFilter(alerts, modeOf)).toEqual({ TODAS: 4, TREN: 3, SUBTE: 1, PREMETRO: 0 })
  })
})
