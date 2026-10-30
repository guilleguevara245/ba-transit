import { afterEach, describe, expect, it } from 'vitest'
import { mergeFavorites, readAll, readList, toggleInList, writeList } from './favoritesStore.js'

function fakeWindow(initial = {}) {
  const data = { ...initial }
  const events = []
  return {
    CustomEvent: class {
      constructor(type, init) {
        this.type = type
        this.detail = init?.detail
      }
    },
    localStorage: { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)) },
    dispatchEvent: (e) => events.push(e),
    events,
    data,
  }
}

describe('favoritos', () => {
  afterEach(() => {
    delete globalThis.window
  })

  it('las lineas siguen en su clave de siempre', () => {
    globalThis.window = fakeWindow({ 'ba-transit:mis-lineas': '[3, 7, 3, "x"]' })
    expect(readList('lineas')).toEqual([3, 7])
  })

  it('estaciones y accesos con sus propios valores', () => {
    globalThis.window = fakeWindow({ 'ba-transit:mis-accesos': '["norte", 5, "Oeste!"]' })
    expect(readList('accesos')).toEqual(['norte'])
    expect(toggleInList('estaciones', 27)).toEqual([27])
    expect(toggleInList('estaciones', 27)).toEqual([])
    expect(window.events.at(-1).detail).toEqual({ kind: 'estaciones', ids: [] })
  })

  it('datos rotos o sin almacenamiento: lista vacia', () => {
    globalThis.window = fakeWindow({ 'ba-transit:mis-estaciones': '{roto' })
    expect(readList('estaciones')).toEqual([])
    globalThis.window = { localStorage: { getItem: () => { throw new Error('bloqueado') } } }
    expect(readAll()).toEqual({ lineas: [], estaciones: [], accesos: [], colectivos: [] })
  })

  it('une dos juegos sin repetir', () => {
    expect(
      mergeFavorites({ lineas: [1, 2], accesos: ['norte'], colectivos: ['152'] }, { lineas: [2, 5], estaciones: [9] }),
    ).toEqual({
      lineas: [1, 2, 5],
      estaciones: [9],
      accesos: ['norte'],
      colectivos: ['152'],
    })
  })

  it('writeList limpia lo invalido', () => {
    globalThis.window = fakeWindow()
    expect(writeList('accesos', ['sur', 'sur', 3])).toEqual(['sur'])
    expect(writeList('colectivos', ['152', '53A', '53a', 'no vale', 7])).toEqual(['152', '53A'])
    expect(window.data['ba-transit:mis-accesos']).toBe('["sur"]')
  })
})
