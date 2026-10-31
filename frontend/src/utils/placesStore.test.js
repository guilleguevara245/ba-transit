import { describe, expect, it } from 'vitest'
import {
  addressArea,
  cleanPlace,
  findStationPlace,
  mergePlaces,
  placePhrase,
  sanitizePlaces,
  savePlace,
} from './placesStore.js'

describe('cleanPlace', () => {
  it('valida y normaliza', () => {
    expect(cleanPlace({ tipo: 'gym', estacion: 1 })).toBeNull()
    expect(cleanPlace({ tipo: 'otro', direccion: '   ' })).toBeNull()
    expect(cleanPlace({ tipo: 'casa', nombre: 'x', estacion: 5, direccion: 'Calle 1' })).toEqual({
      tipo: 'casa',
      nombre: 'Casa',
      estacion: 5,
      direccion: null,
    })
    expect(cleanPlace({ tipo: 'otro', nombre: ' ', direccion: 'Av.\n  Corrientes   1500 ' })).toEqual({
      tipo: 'otro',
      nombre: 'Lugar',
      estacion: null,
      direccion: 'Av. Corrientes 1500',
      lat: null,
      lon: null,
      cerca: null,
    })
    expect(cleanPlace({ tipo: 'otro', nombre: 'a'.repeat(99), estacion: 2 }).nombre).toHaveLength(30)
  })

  it('direccion confirmada: guarda solo la zona y la estacion cercana', () => {
    expect(
      cleanPlace({ tipo: 'casa', direccion: 'Tte Origone 151, Hurlingham', lat: -34.5891, lon: -58.6392, cerca: 77 }),
    ).toEqual({
      tipo: 'casa',
      nombre: 'Casa',
      estacion: null,
      direccion: 'Tte Origone 151, Hurlingham',
      lat: -34.6,
      lon: -58.65,
      cerca: 77,
    })
    // Fuera del AMBA no se guarda la zona; una estacion invalida tampoco.
    const far = cleanPlace({ tipo: 'casa', direccion: 'San Martín 100, Rosario', lat: -32.95, lon: -60.65, cerca: -3 })
    expect([far.lat, far.lon, far.cerca]).toEqual([null, null, null])
  })
})

describe('addressArea', () => {
  it('la parte de la zona de la direccion guardada', () => {
    expect(addressArea('Tte Origone 151, Hurlingham')).toBe('Hurlingham')
    expect(addressArea('Av Corrientes 1234, Ciudad de Buenos Aires')).toBe('Capital')
    expect(addressArea('Av. Corrientes 1500')).toBeNull()
    expect(addressArea(null)).toBeNull()
  })
})

describe('sanitizePlaces', () => {
  it('una Casa, un Trabajo, primero ellos y como mucho 8', () => {
    const list = sanitizePlaces([
      { tipo: 'otro', nombre: 'Club', estacion: 9 },
      { tipo: 'trabajo', estacion: 2 },
      { tipo: 'casa', estacion: 1 },
      { tipo: 'casa', estacion: 3 },
    ])
    expect(list.map((p) => [p.tipo, p.estacion])).toEqual([
      ['casa', 1],
      ['trabajo', 2],
      ['otro', 9],
    ])
    const many = Array.from({ length: 20 }, (_, i) => ({ tipo: 'otro', nombre: `L${i}`, estacion: i + 1 }))
    expect(sanitizePlaces(many)).toHaveLength(8)
    expect(sanitizePlaces('basura')).toEqual([])
  })
})

describe('savePlace', () => {
  it('reemplaza Casa y edita por posicion', () => {
    let list = savePlace([], { tipo: 'casa', estacion: 1 })
    list = savePlace(list, { tipo: 'otro', nombre: 'Club', estacion: 7 })
    list = savePlace(list, { tipo: 'casa', direccion: 'Calle 2' })
    expect(list).toHaveLength(2)
    expect(list[0].direccion).toBe('Calle 2')
    list = savePlace(list, { tipo: 'otro', nombre: 'Gimnasio', estacion: 8 }, 1)
    expect(list.map((p) => p.nombre)).toEqual(['Casa', 'Gimnasio'])
  })
})

describe('mergePlaces', () => {
  const local = [
    { tipo: 'casa', estacion: 1 },
    { tipo: 'trabajo', estacion: 2 },
  ]
  const remote = [{ tipo: 'casa', estacion: 5 }]

  it('con la cuenta ya sincronizada manda la cuenta', () => {
    expect(mergePlaces(local, remote, true).map((p) => p.estacion)).toEqual([5])
  })

  it('la primera vez se suman, con prioridad de la cuenta', () => {
    const merged = mergePlaces(
      [...local, { tipo: 'otro', nombre: 'A', estacion: 9 }],
      [...remote, { tipo: 'otro', nombre: 'B', estacion: 9 }],
      false,
    )
    expect(merged.map((p) => [p.tipo, p.estacion, p.nombre])).toEqual([
      ['casa', 5, 'Casa'],
      ['trabajo', 2, 'Trabajo'],
      ['otro', 9, 'B'],
    ])
  })
})

describe('findStationPlace y placePhrase', () => {
  it('encuentra el lugar de una estacion y arma las frases', () => {
    const options = [
      { stationId: 'lugar-1', stations: [{ stationId: 1 }, { stationId: 4 }] },
      { stationId: 'lugar-2', stations: [{ stationId: 2 }] },
    ]
    expect(findStationPlace(options, 4).stationId).toBe('lugar-1')
    expect(findStationPlace(options, 99)).toBeNull()
    expect(findStationPlace(options, null)).toBeNull()
    expect(`${placePhrase({ tipo: 'casa' }, 'de')} ${placePhrase({ tipo: 'trabajo' }, 'a')}`).toBe('De casa al trabajo')
    expect(placePhrase({ tipo: 'otro', nombre: 'Club' }, 'a')).toBe('a Club')
  })
})
