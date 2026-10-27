import { describe, expect, it } from 'vitest'
import { busDescription, busParams, busTitle, parseBusShortName, stopName } from './busNames.js'

describe('parseBusShortName', () => {
  it('separa numero y cartel', () => {
    expect(parseBusShortName('53A')).toEqual({ number: '53', sign: 'A' })
    expect(parseBusShortName('152')).toEqual({ number: '152', sign: '' })
    expect(parseBusShortName('X1')).toEqual({ number: 'X1', sign: '' })
  })
})

describe('busTitle', () => {
  it('arma el titulo con el cartel', () => {
    expect(busTitle({ shortName: '53A' })).toBe('Línea 53 · Cartel A')
    expect(busTitle({ shortName: '152' })).toBe('Línea 152')
  })
})

describe('busDescription', () => {
  it('oculta los codigos internos del feed', () => {
    expect(busDescription({ shortName: '53A', longName: 'JNAMBA053' })).toBeNull()
    expect(busDescription({ shortName: '532A', longName: 'JMLDZM532' })).toBeNull()
    expect(busDescription({ shortName: '8', longName: 'Retiro - Ezeiza' })).toBe('Retiro - Ezeiza')
  })
})

describe('stopName', () => {
  it('saca el numero interno y pasa de mayusculas a nombre propio', () => {
    expect(stopName('1302 ANTARTIDA ARGENTINA AV.')).toBe('Antartida Argentina Av.')
    expect(stopName('AV. DE MAYO Y PERU')).toBe('Av. de Mayo y Peru')
    expect(stopName('Plaza Italia')).toBe('Plaza Italia')
  })
})

describe('busParams', () => {
  it('pone el numero a la vista y el id aparte', () => {
    expect(busParams('53A', '283')).toEqual({ linea: '53A', id: '283' })
    expect(busParams(null, '283')).toEqual({ linea: '283' })
  })
})
