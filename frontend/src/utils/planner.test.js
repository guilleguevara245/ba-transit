import { describe, expect, it } from 'vitest'
import { googleMapsUrl, nearbyStations, planTrip, walkingAlternative, walkMinutes } from './planner.js'
import { buildPlaces } from './places.js'

// Dos lineas que se cruzan: A (oeste-este) y D (norte-sur), con una
// combinacion oficial A:Peru <-> D:Catedral (a ~150 m).
const st = (id, lineId, lineCode, branchId, seq, name, lat, lon, lineMode = 'SUBTE') => ({
  stationId: id, lineId, lineCode, lineName: `Línea ${lineCode}`, lineMode, branchId, sequenceOrder: seq,
  stationName: name, latitude: lat, longitude: lon,
})
const STATIONS = [
  st(1, 1, 'A', 1, 1, 'Plaza de Mayo', -34.6088, -58.3709),
  st(2, 1, 'A', 1, 2, 'Perú', -34.6086, -58.3742),
  st(3, 1, 'A', 1, 3, 'Piedras', -34.6089, -58.3790),
  st(4, 4, 'D', 4, 1, 'Catedral', -34.6075, -58.3739),
  st(5, 4, 'D', 4, 2, '9 de Julio', -34.6045, -58.3805),
  st(6, 4, 'D', 4, 3, 'Tribunales', -34.6018, -58.3846),
]

describe('planTrip', () => {
  it('viaja en una sola linea sin combinaciones', () => {
    const plan = planTrip(STATIONS, STATIONS[0], STATIONS[2])
    expect(plan.transfers).toBe(0)
    expect(plan.legs).toHaveLength(1)
    expect(plan.legs[0].stops).toBe(2)
    expect(plan.legs[0].towards.stationName).toBe('Piedras')
  })

  it('combina caminando entre lineas', () => {
    const plan = planTrip(STATIONS, STATIONS[0], STATIONS[5])
    expect(plan.legs.map((l) => l.type)).toEqual(['ride', 'walk', 'ride'])
    expect(plan.legs[1].to.stationName).toBe('Catedral')
    expect(plan.legs[2].towards.stationName).toBe('Tribunales')
    expect(plan.transfers).toBe(1)
  })
})

describe('planTrip con lugares', () => {
  // Retiro con dos lineas: C (va al sur) y Mitre (otra direccion).
  const RETIRO = [
    st(10, 3, 'C', 3, 1, 'Retiro', -34.5915, -58.3746),
    st(11, 3, 'C', 3, 2, 'General San Martín', -34.5954, -58.3779),
    st(20, 9, 'MITRE', 9, 1, 'Retiro', -34.5910, -58.3740, 'TREN'),
    st(21, 9, 'MITRE', 9, 2, 'Lisandro de la Torre', -34.5600, -58.4100, 'TREN'),
  ]

  it('agrupa estaciones con el mismo nombre y cercanas', () => {
    const places = buildPlaces(RETIRO)
    const retiro = places.find((p) => p.stationName === 'Retiro')
    expect(retiro.stations).toHaveLength(2)
    expect(retiro.lineName).toBe('Líneas C y MITRE')
  })

  it('sale por la linea que conviene sin caminar al principio', () => {
    const places = buildPlaces(RETIRO)
    const retiro = places.find((p) => p.stationName === 'Retiro')
    const plan = planTrip(RETIRO, retiro, RETIRO[3])
    expect(plan.legs.map((l) => l.type)).toEqual(['ride'])
    expect(plan.legs[0].from.lineCode).toBe('MITRE')
  })
})

describe('planTrip solo accesible', () => {
  const ACC = STATIONS.map((s) => ({ ...s, accessible: s.stationName !== 'Catedral' }))

  it('no combina en estaciones sin accesibilidad', () => {
    // Plaza de Mayo -> Tribunales necesita combinar en Peru <-> Catedral, y Catedral no es accesible.
    expect(planTrip(ACC, ACC[0], ACC[5], { accessibleOnly: true })).toBeNull()
    expect(planTrip(ACC, ACC[0], ACC[5]).transfers).toBe(1)
  })

  it('avisa si el origen o el destino no son accesibles', () => {
    expect(planTrip(ACC, ACC[3], ACC[5], { accessibleOnly: true })).toEqual({ inaccessible: 'origin' })
    expect(planTrip(ACC, ACC[0], ACC[3], { accessibleOnly: true })).toEqual({ inaccessible: 'destination' })
  })
})

describe('googleMapsUrl', () => {
  it('arma el enlace en modo transporte publico', () => {
    const url = googleMapsUrl({ latitude: -34.6, longitude: -58.4 }, 'Obelisco')
    expect(url).toContain('travelmode=transit')
    expect(url).toContain('destination=Obelisco')
  })
})

describe('planTrip con direcciones', () => {
  // Una direccion a unos 300 m de Piedras (A) y otra a unos 250 m de Tribunales (D).
  const FROM = { type: 'address', text: 'Tacuarí 100', area: 'Ciudad de Buenos Aires', lat: -34.6089, lon: -58.3822 }
  const TO = { type: 'address', text: 'Talcahuano 500', area: 'Ciudad de Buenos Aires', lat: -34.6012, lon: -58.3872 }

  it('empieza caminando hasta una estacion cercana', () => {
    const plan = planTrip(STATIONS, FROM, STATIONS[0])
    expect(plan.legs[0].type).toBe('access')
    expect(plan.legs[0].to.stationName).toBe('Piedras')
    expect(plan.legs[0].minutes).toBeGreaterThan(0)
    expect(plan.legs[1].type).toBe('ride')
    expect(plan.transfers).toBe(0)
  })

  it('termina caminando y suma los tramos en el total', () => {
    const plan = planTrip(STATIONS, STATIONS[0], TO)
    expect(plan.legs.map((l) => l.type)).toEqual(['ride', 'walk', 'ride', 'egress'])
    expect(plan.legs[3].from.stationName).toBe('Tribunales')
    expect(plan.minutes).toBe(plan.legs.reduce((sum, l) => sum + l.minutes, 0))
    expect(plan.transfers).toBe(1)
  })

  it('elige la estacion que da el viaje mas corto', () => {
    // Desde una direccion entre Peru y Catedral, a Tribunales conviene subir a la D en Catedral.
    const between = { type: 'address', text: 'Bolívar 100', area: 'CABA', lat: -34.608, lon: -58.3738 }
    const plan = planTrip(STATIONS, between, STATIONS[5])
    expect(plan.legs[0].to.stationName).toBe('Catedral')
    expect(plan.legs.map((l) => l.type)).toEqual(['access', 'ride'])
  })

  it('avisa si no hay estaciones cerca de la direccion', () => {
    const far = { type: 'address', text: 'Ruta 6 1000', area: 'Cañuelas', lat: -35.05, lon: -58.76 }
    expect(planTrip(STATIONS, far, STATIONS[0])).toEqual({ far: 'origin' })
    expect(planTrip(STATIONS, STATIONS[0], far)).toEqual({ far: 'destination' })
  })

  it('con solo accesibles descarta las estaciones cercanas que no lo son', () => {
    const acc = STATIONS.map((s) => ({ ...s, accessible: s.stationName !== 'Piedras' }))
    const plan = planTrip(acc, FROM, acc[0], { accessibleOnly: true })
    expect(plan.legs[0].to.stationName).not.toBe('Piedras')
    const onlyPiedras = { ...FROM, lat: -34.6089, lon: -58.379 }
    const none = STATIONS.map((s) => ({ ...s, accessible: false }))
    expect(planTrip(none, onlyPiedras, none[0], { accessibleOnly: true })).toEqual({ inaccessible: 'origin' })
  })
})

describe('nearbyStations y walkingAlternative', () => {
  it('ordena por distancia y corta en los nombres mas cercanos', () => {
    const near = nearbyStations(STATIONS, { lat: -34.6086, lon: -58.3742 })
    expect(near[0].station.stationName).toBe('Perú')
    expect(new Set(near.map((n) => n.station.stationName)).size).toBeLessThanOrEqual(4)
  })

  it('propone caminar solo si esta cerca', () => {
    expect(walkingAlternative(STATIONS[1], STATIONS[3]).minutes).toBeLessThan(5)
    expect(walkingAlternative(STATIONS[0], { type: 'address', lat: -35.05, lon: -58.76 })).toBeNull()
    expect(walkMinutes(1)).toBe(17)
  })

  it('arma el enlace de Google Maps con la direccion', () => {
    const url = googleMapsUrl({ type: 'address', text: 'Tacuarí 100', area: 'Ciudad de Buenos Aires' }, 'Obelisco')
    expect(decodeURIComponent(url.replace(/\+/g, ' '))).toContain('origin=Tacuarí 100, Ciudad de Buenos Aires, Argentina')
  })
})
