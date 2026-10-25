import { describe, expect, it } from 'vitest'
import { readableTextColor } from './color.js'

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
