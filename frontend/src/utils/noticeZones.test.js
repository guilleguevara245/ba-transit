import { describe, expect, it } from 'vitest'
import { needsStations, noticeZones } from './noticeZones.js'

const stations = [{ stationId: 7, stationName: 'Ituzaingó', latitude: -34.6578, longitude: -58.6703 }]

describe('noticeZones', () => {
  it('Casa (direccion confirmada), Trabajo (estacion) y la zona del clima, en la grilla', () => {
    const places = [
      { tipo: 'casa', estacion: null, direccion: 'Tte Origone 151, Hurlingham', lat: -34.6, lon: -58.65 },
      { tipo: 'trabajo', estacion: 7, direccion: null },
      { tipo: 'otro', estacion: 9, direccion: null },
    ]
    expect(noticeZones({ places, stations, zone: { nombre: 'Moreno', lat: -34.65, lon: -58.8 } })).toEqual([
      { tipo: 'casa', lat: -34.6, lon: -58.65 },
      { tipo: 'trabajo', lat: -34.65, lon: -58.65 },
      { tipo: 'zona', lat: -34.65, lon: -58.8 },
    ])
  })

  it('sin lugares ubicables ni zona: ninguna (llegan las de todo el AMBA)', () => {
    const places = [{ tipo: 'casa', estacion: null, direccion: 'Av. Rivadavia 6500', lat: null, lon: null }]
    expect(noticeZones({ places })).toEqual([])
    expect(noticeZones({ places: [{ tipo: 'casa', estacion: 7 }], stations: null })).toEqual([])
  })

  it('needsStations: solo si Casa o Trabajo son una estacion', () => {
    expect(needsStations([{ tipo: 'casa', estacion: 7 }])).toBe(true)
    expect(needsStations([{ tipo: 'otro', estacion: 7 }])).toBe(false)
    expect(needsStations([])).toBe(false)
  })
})
