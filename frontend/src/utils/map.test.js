import { describe, expect, it } from 'vitest'
import { buildLegend, buildRoutes } from './map.js'

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
