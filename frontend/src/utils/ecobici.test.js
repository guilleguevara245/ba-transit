import { describe, expect, it } from 'vitest'
import { availability, normalizeText, placeKind, stationLabel, stationName, stockLevel } from './ecobici.js'

describe('stationLabel', () => {
  it('saca el numero del principio', () => {
    expect(stationLabel('002 - Retiro I')).toBe('Retiro I')
    expect(stationLabel('Plaza Italia')).toBe('Plaza Italia')
  })
})

describe('availability', () => {
  it('clasifica segun las bicis disponibles', () => {
    expect(availability({ renting: true, bikes: 0 }).key).toBe('empty')
    expect(availability({ renting: true, bikes: 2 }).key).toBe('low')
    expect(availability({ renting: true, bikes: 4 }).key).toBe('low')
    expect(availability({ renting: true, bikes: 5 }).key).toBe('ok')
    expect(availability({ renting: true, bikes: 9 }).key).toBe('ok')
    expect(availability({ renting: false, bikes: 9 }).key).toBe('off')
  })
})

describe('normalizeText', () => {
  it('ignora tildes y mayusculas', () => {
    expect(normalizeText('Plaza Itália')).toBe('plaza italia')
  })
})

describe('stockLevel', () => {
  it('de sobra, pocas, la ultima o ninguna', () => {
    expect(stockLevel(9)).toMatchObject({ key: 'plenty', glyphs: 3, note: null })
    expect(stockLevel(5).key).toBe('plenty')
    expect(stockLevel(4)).toMatchObject({ key: 'few', glyphs: 2 })
    expect(stockLevel(2).key).toBe('few')
    expect(stockLevel(1)).toMatchObject({ key: 'last', glyphs: 1, note: '¡Apurate, queda una!' })
    expect(stockLevel(0)).toMatchObject({ key: 'none', note: null })
  })

  it('con los anclajes avisa si no hay lugar para dejarla', () => {
    expect(stockLevel(1, 'docks').note).toBe('Queda un solo lugar')
    expect(stockLevel(0, 'docks').note).toBe('No hay lugar para dejarla')
  })
})

describe('placeKind', () => {
  it('reconoce plazas, facultades y lugares conocidos por el nombre', () => {
    expect(placeKind('PLAZA ITALIA')).toBe('plaza')
    expect(placeKind('005 - Parque Centenario')).toBe('plaza')
    expect(placeKind('FACULTAD DE DERECHO')).toBe('universidad')
    expect(placeKind('Plaza del Congreso')).toBe('congreso')
    expect(placeKind('Hospital Fernández')).toBe('hospital')
    expect(placeKind('Retiro I')).toBe('estacion')
    expect(placeKind('GAINZA')).toBe('bici')
  })
})

describe('stationName', () => {
  it('escribe normal los nombres en mayusculas', () => {
    expect(stationName('GAINZA')).toBe('Gainza')
    expect(stationName('002 - RETIRO II')).toBe('Retiro II')
    expect(stationName('FACULTAD DE DERECHO - UBA')).toBe('Facultad de Derecho - UBA')
    expect(stationName('Plaza Italia')).toBe('Plaza Italia')
  })
})
