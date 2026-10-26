import { describe, expect, it } from 'vitest'
import { splitLinks } from './links.js'

describe('splitLinks', () => {
  it('separa el link del texto y deja afuera la puntuacion final', () => {
    expect(splitLinks('Opiná en: https://forms.gle/abc. Gracias')).toEqual([
      { text: 'Opiná en: ' },
      { text: 'https://forms.gle/abc', url: 'https://forms.gle/abc' },
      { text: '. Gracias' },
    ])
  })

  it('sin links devuelve el texto entero', () => {
    expect(splitLinks('Desvío por obras')).toEqual([{ text: 'Desvío por obras' }])
    expect(splitLinks(null)).toEqual([])
  })
})
