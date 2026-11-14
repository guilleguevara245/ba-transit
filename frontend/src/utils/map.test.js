import { describe, expect, it } from 'vitest'
import fixtures from '../../e2e/fixtures.json'
import TRACK_SHAPES from '../data/trackShapes.json'
import { SUBTE_TRANSFERS, buildLegend, buildRoutes, connectingLineCodes, decodePolyline, distanceKm, findTransfers, lineSummary, routeInfo, shortOperator, stationBranches, trackBetween } from './map.js'

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

    const routes = buildRoutes(stations, {})

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

  it('va por el trazado de las vias, cortado en la primera y la ultima estacion', () => {
    // Un trazado en L: de (0, 0) a (0, 0.02) y de ahi a (0.02, 0.02).
    const shapes = { 10: '???_|B_|B?' }
    expect(decodePolyline(shapes[10])).toEqual([
      [0, 0],
      [0, 0.02],
      [0.02, 0.02],
    ])
    const routes = buildRoutes([station(1, 10, 1, 1, 0, 0.005), station(2, 10, 1, 2, 0.015, 0.02)], shapes)
    const rounded = routes[0].positions.map(([lat, lon]) => [+lat.toFixed(6), +lon.toFixed(6)])
    expect(rounded).toEqual([
      [0, 0.005],
      [0, 0.005],
      [0, 0.02],
      [0.015, 0.02],
      [0.015, 0.02],
    ])
  })

  it('si las estaciones no caen sobre el trazado, en linea recta', () => {
    const shapes = { 10: '???_|B_|B?' }
    const routes = buildRoutes([station(1, 10, 1, 1, 0.5, 0.5), station(2, 10, 1, 2, 0.6, 0.6)], shapes)
    expect(routes[0].positions).toEqual([
      [0.5, 0.5],
      [0.6, 0.6],
    ])
    // Al reves del trazado tampoco.
    expect(trackBetween(decodePolyline(shapes[10]), [0.015, 0.02], [0, 0.005])).toBeNull()
  })

  it('cada ramal de la red tiene su trazado y pasa cerca de todas sus estaciones', () => {
    const stations = fixtures['/api/v1/map/stations']
    const branches = new Set(stations.map((s) => s.branchId))
    for (const branchId of branches) {
      // Los ramales de prueba de las fixtures (dos estaciones) no son de la red.
      if (stations.filter((s) => s.branchId === branchId).length < 5) continue
      expect(TRACK_SHAPES[branchId], `ramal ${branchId}`).toBeTruthy()
      const [route] = buildRoutes(stations.filter((s) => s.branchId === branchId))
      // Con el trazado hay mas puntos que estaciones.
      const count = stations.filter((s) => s.branchId === branchId).length
      expect(route.positions.length, `ramal ${branchId}`).toBeGreaterThan(count)
      for (const s of stations.filter((st) => st.branchId === branchId)) {
        const near = route.positions.some((p, i) => {
          if (i === 0) return false
          const q = route.positions[i - 1]
          // distancia al tramo, aproximada con puntos intermedios
          for (let t = 0; t <= 1; t += 0.02) {
            const x = { latitude: q[0] + t * (p[0] - q[0]), longitude: q[1] + t * (p[1] - q[1]) }
            if (distanceKm(x, s) < 0.6) return true
          }
          return false
        })
        expect(near, `${s.stationName} (ramal ${branchId})`).toBe(true)
      }
    }
  })
})

describe('buildLegend', () => {
  it('una entrada por linea', () => {
    const legend = buildLegend([station(1, 10, 1, 1, 0, 0), station(2, 10, 1, 2, 0, 0), station(3, 20, 2, 1, 0, 0)])

    expect(legend).toEqual([
      { id: 1, name: 'Línea 1', color: '#000001' },
      { id: 2, name: 'Línea 2', color: '#000002' },
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
      for (const key of group) expect(/^[A-HP]:.+/.test(key)).toBe(true)
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

describe('shortOperator', () => {
  it('acorta el nombre de la operadora', () => {
    expect(shortOperator('Trenes Argentinos Operaciones')).toBe('Trenes Argentinos')
    expect(shortOperator('Emova Movilidad')).toBe('Emova')
    expect(shortOperator('Ferrovías')).toBe('Ferrovías')
    expect(shortOperator('Metrovías')).toBe('Metrovías')
  })

  it('sin dato devuelve null', () => {
    expect(shortOperator(null)).toBeNull()
    expect(shortOperator('  ')).toBeNull()
  })
})

describe('distanceKm', () => {
  it('Retiro (Mitre) a Belgrano R son unos 9 km en linea recta', () => {
    const d = distanceKm({ latitude: -34.5908, longitude: -58.3751 }, { latitude: -34.5678, longitude: -58.4625 })
    expect(d > 8 && d < 9).toBe(true)
  })
})

describe('lineSummary', () => {
  it('cuenta estaciones distintas y arma cada ramal', () => {
    const s = (branchId, seq, name, lat) => ({ branchId, sequenceOrder: seq, stationName: name, latitude: lat, longitude: -58.4 })
    const summary = lineSummary([s(1, 1, 'Retiro', -34.59), s(1, 2, 'Tigre', -34.5), s(2, 1, 'Retiro', -34.59), s(2, 2, 'Suárez', -34.53)])

    expect(summary.stationCount).toBe(3)
    expect(summary.branches.map((b) => `${b.from}-${b.to}`)).toEqual(['Retiro-Tigre', 'Retiro-Suárez'])
    expect(Math.round(summary.branches[0].km)).toBe(10)
    expect(summary.branches[0].via).toBe(null)
  })

  it('toma el "vía" del nombre del ramal', () => {
    const s = (branchId, seq, name, lat) => ({ branchId, sequenceOrder: seq, stationName: name, latitude: lat, longitude: -58.4 })
    const names = new Map([[1, 'Plaza Constitución - Bosques (vía Quilmes)'], [2, 'Plaza Constitución - Bosques (vía Temperley)']])
    const summary = lineSummary([s(1, 1, 'Plaza Constitución', -34.6), s(1, 2, 'Bosques', -34.8), s(2, 1, 'Plaza Constitución', -34.6), s(2, 2, 'Bosques', -34.8)], names)

    expect(summary.branches.map((b) => b.via)).toEqual(['vía Quilmes', 'vía Temperley'])
  })
})

describe('connectingLineCodes', () => {
  it('lineas con las que combina la A', () => {
    expect(connectingLineCodes('A')).toEqual(['C', 'D', 'E', 'H'])
  })

  it('una linea sin combinaciones', () => {
    expect(connectingLineCodes('Z')).toEqual([])
  })
})

describe('combinacion con el Premetro', () => {
  it('la linea P combina con la E en Intendente Saguier', () => {
    expect(connectingLineCodes('P')).toEqual(['E'])
    expect(connectingLineCodes('E')).toContain('P')
  })
})

describe('stationBranches', () => {
  const s = (id, branchId, seq, name) => ({ stationId: id, lineId: 7, branchId, sequenceOrder: seq, stationName: name })
  // Temperley es parada de dos ramales.
  const stations = [
    s(1, 1, 1, 'Plaza Constitución'), s(2, 1, 2, 'Temperley'), s(3, 1, 3, 'La Plata'),
    s(4, 2, 1, 'Plaza Constitución'), s(5, 2, 2, 'Temperley'), s(6, 2, 3, 'Ezeiza'),
  ]

  it('una estacion de varios ramales los lista todos', () => {
    const result = stationBranches(stations, stations[1])
    expect(result.map((r) => `${r.from}-${r.to}`)).toEqual(['Plaza Constitución-La Plata', 'Plaza Constitución-Ezeiza'])
  })

  it('una estacion de un solo ramal', () => {
    expect(stationBranches(stations, stations[2])).toHaveLength(1)
  })
})
