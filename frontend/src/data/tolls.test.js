import { describe, expect, it } from 'vitest'
import { peakNow } from './tolls.js'

// 26/10/2026 es lunes; 25/10/2026, domingo.
const at = (day, h, m = 0) => new Date(2026, 9, day, h, m)

describe('peakNow', () => {
  it('Panamericana en dia habil: pico en ambos sentidos', () => {
    expect(peakNow('norte', at(26, 17, 52))).toEqual({ peak: true, towards: null })
    expect(peakNow('norte', at(26, 7, 0))).toEqual({ peak: true, towards: null })
    expect(peakNow('norte', at(26, 11, 0))).toEqual({ peak: false, towards: null })
    expect(peakNow('norte', at(26, 13, 0))).toEqual({ peak: false, towards: null })
  })

  it('Panamericana el fin de semana: pico en un solo sentido', () => {
    expect(peakNow('oeste', at(25, 12, 0))).toEqual({ peak: true, towards: 'Provincia' })
    expect(peakNow('oeste', at(25, 18, 30))).toEqual({ peak: true, towards: 'CABA' })
    expect(peakNow('oeste', at(25, 16, 0))).toEqual({ peak: false, towards: null })
  })

  it('un feriado entre semana se trata como fin de semana', () => {
    expect(peakNow('norte', at(26, 8, 0), true)).toEqual({ peak: false, towards: null })
    expect(peakNow('norte', at(26, 12, 0), true)).toEqual({ peak: true, towards: 'Provincia' })
  })

  it('La Plata y Riccheri solo tienen pico los dias habiles', () => {
    expect(peakNow('la-plata', at(26, 10, 30))).toEqual({ peak: false, towards: null })
    expect(peakNow('la-plata', at(26, 17, 0))).toEqual({ peak: true, towards: null })
    expect(peakNow('riccheri', at(25, 18, 0))).toEqual({ peak: false, towards: null })
    expect(peakNow('desconocido', at(26, 8, 0))).toEqual({ peak: false, towards: null })
  })
})
