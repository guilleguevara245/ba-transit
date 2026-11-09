import { describe, expect, it } from 'vitest'
import { cardHeader, readableTextColor } from './color.js'

describe('readableTextColor', () => {
  it('texto oscuro sobre colores claros', () => {
    expect(readableTextColor('#FFD100')).toBe('#17171a')
  })

  it('texto blanco sobre colores oscuros', () => {
    expect(readableTextColor('#0057A8')).toBe('#ffffff')
    expect(readableTextColor('#92278F')).toBe('#ffffff')
  })

  it('si el color es invalido usa blanco', () => {
    expect(readableTextColor(null)).toBe('#ffffff')
  })
})

describe('cardHeader', () => {
  it('pinta el encabezado con el color y el texto que se lee encima', () => {
    expect(cardHeader('#92278F')).toEqual({
      className: ' has-header header-light-ink',
      style: { '--card-color': '#92278F', '--card-ink': '#ffffff' },
    })
    expect(cardHeader('#f4c11b')).toEqual({
      className: ' has-header',
      style: { '--card-color': '#f4c11b', '--card-ink': '#17171a' },
    })
  })

  it('sin color, la tarjeta queda como siempre', () => {
    expect(cardHeader(undefined)).toEqual({ className: '', style: undefined })
  })
})
