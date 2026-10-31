import { describe, expect, it } from 'vitest'
import { dedupeNews, newsCounts, sameStory } from './news.js'

describe('newsCounts', () => {
  it('cuenta por tema e ignora temas desconocidos', () => {
    const items = [{ category: 'SUBTE' }, { category: 'SUBTE' }, { category: 'TRENES' }, { category: 'OTRO' }]
    expect(newsCounts(items)).toEqual({ SUBTE: 2, TRENES: 1, COLECTIVOS: 0, GENERAL: 0 })
    expect(newsCounts(undefined)).toEqual({ SUBTE: 0, TRENES: 0, COLECTIVOS: 0, GENERAL: 0 })
  })
})

describe('dedupeNews', () => {
  const n = (id, title) => ({ id, title })
  const items = [
    n(
      1,
      'El Gobierno aumenta los subsidios a los colectivos del AMBA mientras el interior paga boletos hasta cuatro veces más caros',
    ),
    n(2, 'El subte porteño sube 3,9% en noviembre y el boleto llegará a $1.887'),
    n(
      3,
      'Subsidios al transporte: el Gobierno aumentará los aportes para frenar un nuevo tarifazo en los colectivos del AMBA',
    ),
    n(4, 'Línea C: por obras, este lunes cierra la estación Independencia'),
    n(5, 'Colectivos del AMBA: el Gobierno aumentará los subsidios para mantener el boleto sin cambios hasta enero'),
    n(6, 'Subsidios: Milei les carga un chorrito de kirchnerismo a los colectivos del AMBA'),
    n(7, 'Nuevo aumento del subte: la suba acumulada ya supera el 45% en el año'),
  ]

  it('la misma nota en varios medios queda una vez, la primera', () => {
    expect(dedupeNews(items).map((x) => x.id)).toEqual([1, 2, 4, 6, 7])
  })

  it('titulares distintos del mismo tema no se juntan', () => {
    expect(sameStory(items[1].title, items[6].title)).toBe(false)
    expect(sameStory(items[3].title, items[1].title)).toBe(false)
  })
})
