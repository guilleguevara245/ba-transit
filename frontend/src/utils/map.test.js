import { describe, expect, it } from 'vitest'
import { SUBTE_TRANSFERS, buildLegend, buildRoutes, findTransfers, routeInfo } from './map.js'

const station = (id, branchId, lineId, sequenceOrder, lat, lng) => ({
  stationId: id,
  branchId,
  lineId,
  lineName: `Línea ${lineId}`,
  lineColorHex: `#00000${lineId}`,
  sequenceOrder,
  latitude: lat,
  longitude: lng,
})

describe('buildRoutes', () => {
  it('arma un recorrido por ramal, ordenado por secuencia', () => {
    const stations = [
      station(2, 10, 1, 2, -34.61, -58.38),
      station(1, 10, 1, 1, -34.6, -58.37),
      station(3, 20, 2, 1, -34.7, -58.4),
      station(4, 20, 2, 2, -34.71, -58.41),
    ]

    const routes = buildRoutes(stations)

    expect(routes.length).toBe(2)
    expect(routes[0].positions).toEqual([
      [-34.6, -58.37],
      [-34.61, -58.38],
    ])
    expect(routes[1].color).toBe('#000002')
  })

  it('descarta ramales con una sola estacion', () => {
    expect(buildRoutes([station(1, 10, 1, 1, -34.6, -58.37)])).toEqual([])
  })
})

describe('buildLegend', () => {
  it('una entrada por linea', () => {
    const legend = buildLegend([station(1, 10, 1, 1, 0, 0), station(2, 10, 1, 2, 0, 0), station(3, 20, 2, 1, 0, 0)])

    expect(legend).toEqual([
      { name: 'Línea 1', color: '#000001' },
      { name: 'Línea 2', color: '#000002' },
    ])
  })
})

describe('findTransfers', () => {
  const s = (id, lineId, lineCode, stationName) => ({ stationId: id, lineId, lineCode, stationName })
  const stations = [s(1, 1, 'A', 'Perú'), s(2, 4, 'D', 'Catedral'), s(3, 5, 'E', 'Bolívar'), s(4, 1, 'A', 'Piedras')]

  it('devuelve las estaciones de otras lineas del mismo grupo', () => {
    expect(findTransfers(stations, stations[0]).map((t) => t.stationId)).toEqual([2, 3])
  })

  it('una estacion sin combinacion devuelve lista vacia', () => {
    expect(findTransfers(stations, stations[3])).toEqual([])
  })

  it('los nombres de SUBTE_TRANSFERS tienen formato linea:estacion', () => {
    for (const group of SUBTE_TRANSFERS) {
      for (const key of group) expect(/^[A-H]:.+/.test(key)).toBe(true)
    }
  })
})

describe('routeInfo', () => {
  it('posicion y cabeceras dentro del ramal', () => {
    const s = (id, seq, name) => ({ stationId: id, branchId: 7, sequenceOrder: seq, stationName: name })
    const stations = [s(3, 3, 'Retiro'), s(1, 1, 'Constitución'), s(2, 2, 'San Juan')]

    expect(routeInfo(stations, stations[2])).toEqual({ position: 2, total: 3, from: 'Constitución', to: 'Retiro' })
  })
})
