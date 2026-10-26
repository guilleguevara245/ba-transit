import { describe, expect, it } from 'vitest'
import { holidayOn, localDateKey } from './holidays.js'

describe('holidayOn', () => {
  it('reconoce un feriado y un dia habitual', () => {
    expect(holidayOn(new Date('2026-12-25T15:00:00-03:00'))).toBe('Navidad')
    expect(holidayOn(new Date('2026-10-25T15:00:00-03:00'))).toBeNull()
  })

  it('usa la fecha de Buenos Aires', () => {
    // 01:00 UTC del 24/11 todavia es 23/11 en Buenos Aires.
    expect(localDateKey(new Date('2026-11-24T01:00:00Z'))).toBe('2026-11-23')
    expect(holidayOn(new Date('2026-11-24T01:00:00Z'))).toBe('Día de la Soberanía Nacional')
  })
})
