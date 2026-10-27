import { describe, expect, it } from 'vitest'
import { festiveFor } from './festive.js'

const at = (iso) => new Date(`${iso}T12:00:00-03:00`)

describe('festiveFor', () => {
  it('un dia comun no cambia nada', () => {
    expect(festiveFor(at('2026-10-27'))).toEqual({
      greeting: null,
      withName: true,
      phrase: null,
      decoration: null,
      wave: false,
    })
  })

  it('fechas patrias con escarapela', () => {
    const may = festiveFor(at('2026-05-25'))
    expect(may.greeting).toBe('Feliz 25 de Mayo')
    expect(may.phrase).toMatch(/empanadas/)
    expect(may.decoration).toBe('escarapela')
    // San Martin se mueve: 2027 cae el 16 de agosto.
    expect(festiveFor(at('2027-08-16')).decoration).toBe('escarapela')
  })

  it('diciembre: gorrito todo el mes y Navidad con recalentado', () => {
    expect(festiveFor(at('2026-12-03')).decoration).toBe('gorro')
    expect(festiveFor(at('2026-12-27')).phrase).toMatch(/Semana de fiestas/)
    const xmas = festiveFor(at('2026-12-25'))
    expect(xmas.greeting).toBe('Feliz Navidad')
    expect(xmas.phrase).toMatch(/recalentado/)
  })

  it('fechas de memoria sin adornos', () => {
    const march = festiveFor(at('2027-03-24'))
    expect(march.greeting).toBe('Nunca más')
    expect(march.withName).toBe(false)
    expect(march.decoration).toBe(null)
    const malvinas = festiveFor(at('2027-04-02'))
    expect(malvinas.greeting).toBe(null)
    expect(malvinas.phrase).toMatch(/Malvinas/)
  })

  it('Dia del Amigo saluda con la mano y carnaval por nombre de feriado', () => {
    expect(festiveFor(at('2026-07-20')).wave).toBe(true)
    expect(festiveFor(at('2027-02-08')).greeting).toBe('Feliz Carnaval')
  })

  it('arbolito el 8 de diciembre y Pascuas de viernes a domingo', () => {
    expect(festiveFor(at('2026-12-08')).phrase).toMatch(/arbolito/)
    expect(festiveFor(at('2026-04-03')).greeting).toBe('Felices Pascuas') // viernes santo
    expect(festiveFor(at('2026-04-05')).greeting).toBe('Felices Pascuas') // domingo
    expect(festiveFor(at('2026-04-06')).greeting).toBe(null)
  })

  it('dias populares y del transporte', () => {
    const vday = festiveFor(at('2027-02-14'))
    expect(vday.greeting).toBe('Feliz San Valentín')
    expect(vday.decoration).toBe('corazones')
    expect(festiveFor(at('2026-09-24')).greeting).toBe(null)
    expect(festiveFor(at('2026-09-24')).phrase).toMatch(/^Día del Colectivero/)
    expect(festiveFor(at('2026-06-11')).greeting).toBe('Buenos Aires cumple años')
    expect(festiveFor(at('2026-06-11')).withName).toBe(true)
    expect(festiveFor(at('2026-10-31')).phrase).toMatch(/hora pico/)
    // Diciembre: dia propio, con gorro igual.
    const subte = festiveFor(at('2026-12-01'))
    expect(subte.greeting).toBe('El subte cumple años')
    expect(subte.decoration).toBe('gorro')
  })

  it('Dia del Padre y de la Madre: tercer domingo', () => {
    expect(festiveFor(at('2026-06-21')).phrase).toMatch(/^Día del Padre/)
    expect(festiveFor(at('2026-10-18')).phrase).toMatch(/^Día de la Madre/)
    expect(festiveFor(at('2026-10-25')).phrase).toBe(null)
    // 2027: el tercer domingo de junio es el 20, Dia de la Bandera: gana la fecha patria.
    expect(festiveFor(at('2027-06-20')).greeting).toBe('Feliz Día de la Bandera')
  })

  it('otro feriado lo nombra', () => {
    expect(festiveFor(at('2026-10-12')).phrase).toMatch(/Diversidad Cultural/)
  })
})
