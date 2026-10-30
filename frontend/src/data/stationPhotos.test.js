import { describe, expect, it } from 'vitest'
import { STATION_PHOTOS, photoCredits, photoFor, photoKey } from './stationPhotos.js'

const PHOTOS = {
  'subte-b/medrano': { name: 'Medrano, Línea B', file: '/estaciones/subte-b/medrano.jpg', author: 'Ana', license: 'CC BY-SA 4.0' },
  'roca/gerli': { name: 'Gerli, Línea Roca', file: '/estaciones/roca/gerli.jpg', author: 'Beto', license: 'CC BY 2.0' },
}

describe('fotos de las estaciones', () => {
  it('la clave usa los slugs de las direcciones del sitio', () => {
    expect(photoKey({ lineMode: 'SUBTE', lineCode: 'B', stationName: 'Medrano' })).toBe('subte-b/medrano')
    expect(photoKey({ lineMode: 'PREMETRO', lineCode: 'P', stationName: 'Pola' })).toBe('premetro/pola')
    expect(photoKey({ lineMode: 'TREN', lineCode: 'SAN_MARTIN', stationName: 'Villa del Parque' })).toBe(
      'san-martin/villa-del-parque',
    )
    expect(photoKey({ lineMode: 'SUBTE', stationName: 'Sin código' })).toBeNull()
  })

  it('photoFor devuelve la foto o null', () => {
    expect(photoFor({ lineMode: 'SUBTE', lineCode: 'B', stationName: 'Medrano' }, PHOTOS).author).toBe('Ana')
    expect(photoFor({ lineMode: 'SUBTE', lineCode: 'B', stationName: 'Dorrego' }, PHOTOS)).toBeNull()
  })

  it('los créditos van ordenados por estación', () => {
    expect(photoCredits(PHOTOS).map((c) => c.name)).toEqual(['Gerli, Línea Roca', 'Medrano, Línea B'])
    expect(photoCredits({})).toEqual([])
  })
})

describe('lista de fotos', () => {
  it('cada foto tiene su archivo, autor, licencia y ficha de Commons', () => {
    const entries = Object.entries(STATION_PHOTOS)
    expect(entries.length).toBeGreaterThan(200)
    for (const [key, photo] of entries) {
      expect(photo.file).toBe(`/estaciones/${key}.jpg`)
      expect(photo.name.length).toBeGreaterThan(3)
      expect(photo.author.length).toBeGreaterThan(0)
      expect(photo.license.length).toBeGreaterThan(0)
      expect(photo.source.startsWith('https://commons.wikimedia.org/')).toBe(true)
    }
  })
})
