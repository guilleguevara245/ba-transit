import { afterEach, describe, expect, it } from 'vitest'
import { readFavorites } from './useFavorites.js'

function fakeStorage(initial) {
  const data = { ...initial }
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)) }
}

describe('readFavorites', () => {
  afterEach(() => {
    delete globalThis.window
  })

  it('lee los ids guardados', () => {
    globalThis.window = { localStorage: fakeStorage({ 'ba-transit:mis-lineas': '[3, 7]' }) }
    expect(readFavorites()).toEqual([3, 7])
  })

  it('ignora datos rotos o sin almacenamiento disponible', () => {
    globalThis.window = { localStorage: fakeStorage({ 'ba-transit:mis-lineas': '{no es json' }) }
    expect(readFavorites()).toEqual([])
    globalThis.window = {
      localStorage: {
        getItem: () => {
          throw new Error('bloqueado')
        },
      },
    }
    expect(readFavorites()).toEqual([])
  })
})
