// Arma src/data/trackShapes.json: el trazado de las vias de cada ramal (subte,
// Premetro y trenes) para dibujar las lineas del mapa por donde van y no en
// linea recta de estacion a estacion.
//
// Toma las estaciones de la API (en orden, por ramal) y las vias de
// OpenStreetMap (Overpass), y une cada estacion con la siguiente por el camino
// mas corto sobre las vias. Si un tramo no se encuentra o da mucha vuelta, ese
// tramo queda recto y se avisa. El resultado se simplifica (6 m) y se guarda
// como polylines codificados.
//
// Uso (con red): node scripts/trackShapes.mjs [https://ba-transit-api.onrender.com]
// Hay que volver a correrlo si cambian las estaciones o se agrega un ramal.

import { writeFileSync } from 'node:fs'

const API = process.argv[2] ?? 'https://ba-transit-api.onrender.com'
const OVERPASS = 'https://overpass-api.de/api/interpreter'
const SNAP_METERS = 350
const TOLERANCE_METERS = 6

const R = 6371000
const rad = Math.PI / 180
const dist = (a, b) => {
  const x = (b[1] - a[1]) * rad * Math.cos(((a[0] + b[0]) / 2) * rad)
  const y = (b[0] - a[0]) * rad
  return Math.sqrt(x * x + y * y) * R
}

const stations = await fetch(`${API}/api/v1/map/stations`).then((r) => r.json())
let [minLat, maxLat, minLon, maxLon] = [90, -90, 180, -180]
for (const s of stations) {
  minLat = Math.min(minLat, s.latitude)
  maxLat = Math.max(maxLat, s.latitude)
  minLon = Math.min(minLon, s.longitude)
  maxLon = Math.max(maxLon, s.longitude)
}
const bbox = [minLat - 0.03, minLon - 0.03, maxLat + 0.03, maxLon + 0.03].map((v) => v.toFixed(3)).join(',')
const query = `[out:json][timeout:180];way["railway"~"^(rail|subway|light_rail|tram|narrow_gauge)$"]["service"!~"^(yard|siding|spur)$"](${bbox});out body;>;out skel qt;`
const osm = await fetch(OVERPASS, {
  method: 'POST',
  body: 'data=' + encodeURIComponent(query),
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'BA-Transit/1.0 (https://ba-transit.onrender.com)' },
}).then((r) => r.json())

// Grafo de las vias: uno por tipo (subte, Premetro, tren) y uno con todo.
const node = new Map()
for (const e of osm.elements) if (e.type === 'node') node.set(e.id, [e.lat, e.lon])
const groupOf = (t) => (t === 'subway' ? 'subway' : t === 'light_rail' || t === 'tram' ? 'light' : 'rail')
const graphs = { subway: new Map(), light: new Map(), rail: new Map(), all: new Map() }
const link = (g, a, b, w) => {
  if (!g.has(a)) g.set(a, [])
  if (!g.has(b)) g.set(b, [])
  g.get(a).push([b, w])
  g.get(b).push([a, w])
}
for (const e of osm.elements) {
  if (e.type !== 'way') continue
  const group = groupOf(e.tags?.railway)
  for (let i = 1; i < e.nodes.length; i++) {
    const pa = node.get(e.nodes[i - 1])
    const pb = node.get(e.nodes[i])
    if (!pa || !pb) continue
    const w = dist(pa, pb)
    link(graphs[group], e.nodes[i - 1], e.nodes[i], w)
    link(graphs.all, e.nodes[i - 1], e.nodes[i], w)
  }
}

// Indice de grilla para buscar los nodos cerca de una estacion.
const CELL = 0.005
const indexes = {}
for (const [k, g] of Object.entries(graphs)) {
  const index = new Map()
  for (const id of g.keys()) {
    const p = node.get(id)
    const key = `${Math.floor(p[0] / CELL)}:${Math.floor(p[1] / CELL)}`
    if (!index.has(key)) index.set(key, [])
    index.get(key).push(id)
  }
  indexes[k] = index
}
function near(k, p, max) {
  const out = []
  const ci = Math.floor(p[0] / CELL)
  const cj = Math.floor(p[1] / CELL)
  const span = Math.ceil(max / 450) + 1
  for (let i = ci - span; i <= ci + span; i++) {
    for (let j = cj - span; j <= cj + span; j++) {
      for (const id of indexes[k].get(`${i}:${j}`) ?? []) {
        const d = dist(p, node.get(id))
        if (d <= max) out.push([id, d])
      }
    }
  }
  return out
}

// Camino mas corto de cualquier nodo cerca de A a cualquiera cerca de B
// (lo lejos que queda cada nodo de su estacion cuenta doble).
function route(k, A, B) {
  const g = graphs[k]
  const starts = near(k, A, SNAP_METERS)
  const ends = near(k, B, SNAP_METERS)
  if (!starts.length || !ends.length) return null
  const target = new Map(ends.map(([id, d]) => [id, d * 2]))
  const limit = dist(A, B) * 3 + 2000
  const best = new Map()
  const prev = new Map()
  const heap = []
  const push = (d, id) => {
    heap.push([d, id])
    let i = heap.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p][0] <= heap[i][0]) break
      ;[heap[p], heap[i]] = [heap[i], heap[p]]
      i = p
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()
    if (heap.length) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let s = i
        if (l < heap.length && heap[l][0] < heap[s][0]) s = l
        if (r < heap.length && heap[r][0] < heap[s][0]) s = r
        if (s === i) break
        ;[heap[s], heap[i]] = [heap[i], heap[s]]
        i = s
      }
    }
    return top
  }
  for (const [id, d] of starts) {
    if (d * 2 < (best.get(id) ?? Infinity)) {
      best.set(id, d * 2)
      prev.set(id, null)
      push(d * 2, id)
    }
  }
  let found = null
  let foundCost = Infinity
  while (heap.length) {
    const [d, id] = pop()
    if (d > (best.get(id) ?? Infinity)) continue
    if (d >= foundCost || d > limit) break
    if (target.has(id) && d + target.get(id) < foundCost) {
      foundCost = d + target.get(id)
      found = id
    }
    for (const [next, w] of g.get(id) ?? []) {
      if (d + w < (best.get(next) ?? Infinity)) {
        best.set(next, d + w)
        prev.set(next, id)
        push(d + w, next)
      }
    }
  }
  if (found == null) return null
  const path = []
  for (let id = found; id != null; id = prev.get(id)) path.push(node.get(id))
  path.reverse()
  let length = 0
  for (let i = 1; i < path.length; i++) length += dist(path[i - 1], path[i])
  return { path, length }
}

// Douglas-Peucker en metros.
function simplify(points, tolerance) {
  if (points.length < 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const lat0 = points[0][0] * rad
  const xy = points.map((p) => [p[1] * rad * Math.cos(lat0) * R, p[0] * rad * R])
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()
    let max = 0
    let at = -1
    const [x1, y1] = xy[s]
    const [x2, y2] = xy[e]
    const dx = x2 - x1
    const dy = y2 - y1
    const length = dx * dx + dy * dy
    for (let i = s + 1; i < e; i++) {
      const [x, y] = xy[i]
      const t = length ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / length)) : 0
      const d = Math.hypot(x1 + t * dx - x, y1 + t * dy - y)
      if (d > max) {
        max = d
        at = i
      }
    }
    if (max > tolerance) {
      keep[at] = 1
      stack.push([s, at], [at, e])
    }
  }
  return points.filter((_, i) => keep[i])
}

function encode(points) {
  let out = ''
  let lastLat = 0
  let lastLon = 0
  const value = (v) => {
    v = v < 0 ? ~(v << 1) : v << 1
    let s = ''
    while (v >= 0x20) {
      s += String.fromCharCode((0x20 | (v & 0x1f)) + 63)
      v >>= 5
    }
    return s + String.fromCharCode(v + 63)
  }
  for (const [lat, lon] of points) {
    const a = Math.round(lat * 1e5)
    const b = Math.round(lon * 1e5)
    out += value(a - lastLat) + value(b - lastLon)
    lastLat = a
    lastLon = b
  }
  return out
}

const branches = new Map()
for (const s of stations) {
  if (!branches.has(s.branchId)) branches.set(s.branchId, [])
  branches.get(s.branchId).push(s)
}
const shapes = {}
for (const [branchId, list] of branches) {
  if (list.length < 2) continue
  list.sort((a, b) => a.sequenceOrder - b.sequenceOrder)
  const mode = list[0].lineMode
  const k = mode === 'SUBTE' ? 'subway' : mode === 'PREMETRO' ? 'light' : 'rail'
  const points = []
  for (let i = 1; i < list.length; i++) {
    const A = [list[i - 1].latitude, list[i - 1].longitude]
    const B = [list[i].latitude, list[i].longitude]
    const straight = dist(A, B)
    let r = route(k, A, B)
    if (!r || r.length > straight * 2 + 600) {
      const other = route('all', A, B)
      if (other && (!r || other.length < r.length)) r = other
    }
    let stretch
    if (!r || r.length > straight * 2 + 600) {
      console.warn(`Ramal ${branchId}: ${list[i - 1].stationName} > ${list[i].stationName} queda recto`)
      stretch = [A, B]
    } else {
      stretch = [A, ...r.path, B]
    }
    points.push(...(points.length ? stretch.slice(1) : stretch))
  }
  shapes[branchId] = encode(simplify(points, TOLERANCE_METERS))
}

const file = new URL('../src/data/trackShapes.json', import.meta.url)
writeFileSync(file, JSON.stringify(shapes, null, 2) + '\n')
console.log(`Listo: ${Object.keys(shapes).length} ramales.`)
