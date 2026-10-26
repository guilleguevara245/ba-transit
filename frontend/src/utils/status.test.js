import { describe, expect, it } from 'vitest'
import { statusSummary } from './status.js'

describe('statusSummary', () => {
  it('todas bien (las que no se consultaron no cuentan como falla)', () => {
    expect(statusSummary([{ status: 'OK' }, { status: 'SIN_DATOS' }]).tone).toBe('ok')
  })

  it('una o varias fallando', () => {
    expect(statusSummary([{ status: 'ERROR', what: 'Estado del Urquiza' }, { status: 'OK' }])).toEqual({
      tone: 'error',
      text: 'Estado del Urquiza: la fuente no está respondiendo.',
    })
    expect(statusSummary([{ status: 'ERROR' }, { status: 'ERROR' }]).text).toBe('2 fuentes no están respondiendo.')
  })
})
