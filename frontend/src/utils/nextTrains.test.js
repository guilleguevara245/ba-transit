import { describe, expect, it } from 'vitest'
import {
  arrivalDetails,
  clockIn,
  formatArrival,
  hasLiveArrivals,
  hasTrainTimes,
  nextTrainsPath,
  scheduleLabel,
  schedulePath,
  serverArrivalText,
  serviceKind,
  sharedPlatform,
  tripTrainsPath,
} from './nextTrains.js'

describe('nextTrainsPath / schedulePath', () => {
  it('subte y trenes (salvo el Urquiza) piden al servidor; subte y premetro tienen horario', () => {
    expect(nextTrainsPath('SUBTE', 'D', 'Bulnes')).toBe('/api/v1/subte/proximos?linea=D&estacion=Bulnes')
    expect(nextTrainsPath('TREN', 'BELGRANO_NORTE', 'Florida')).toBe('/api/v1/trenes/proximos?linea=BELGRANO_NORTE&estacion=Florida')
    expect(nextTrainsPath('TREN', 'ROCA', 'Bernal')).toBe('/api/v1/trenes/proximos?linea=ROCA&estacion=Bernal')
    expect(nextTrainsPath('TREN', 'URQUIZA', 'Artigas')).toBe(null)
    expect(hasTrainTimes('TREN', 'TREN_DE_LA_COSTA')).toBe(true)
    expect(hasTrainTimes('TREN', 'URQUIZA')).toBe(true)
    expect(schedulePath('PREMETRO', 'P', 'Pola')).toBe('/api/v1/subte/horario?linea=P&estacion=Pola')
    expect(schedulePath('TREN', 'ROCA', 'Bernal')).toBe(null)
  })
})

describe('hasLiveArrivals', () => {
  it('solo cuenta si hay algun tren', () => {
    expect(hasLiveArrivals(null)).toBe(false)
    expect(hasLiveArrivals({ available: true, directions: [] })).toBe(false)
    expect(hasLiveArrivals({ available: true, directions: [{ arrivals: [] }] })).toBe(false)
    expect(hasLiveArrivals({ available: true, directions: [{ arrivals: [{ minutes: 2 }] }] })).toBe(true)
  })
})

describe('scheduleLabel', () => {
  const now = new Date(2026, 9, 26, 5, 0)
  it('proximas pasadas aproximadas', () => {
    expect(scheduleLabel({ headwayMinutes: 5, arrivals: [{ minutes: 2, estimated: true }, { minutes: 7, estimated: true }] }, now)).toBe('~2 min · ~7 min')
  })
  it('antes del servicio muestra el primer tren', () => {
    expect(scheduleLabel({ headwayMinutes: null, arrivals: [{ minutes: 30, estimated: true }] }, now)).toBe('Primer tren 5:30')
    expect(clockIn(75, now)).toBe('6:15')
  })
  it('sin mas trenes', () => {
    expect(scheduleLabel({ headwayMinutes: null, arrivals: [] }, now)).toBe('Sin más trenes hoy')
  })
})

describe('formatArrival', () => {
  it('minutos, y desde la hora en horas y minutos', () => {
    expect(formatArrival({ minutes: 0 })).toBe('llegando')
    expect(formatArrival({ minutes: 26 })).toBe('26 min')
    expect(formatArrival({ minutes: 87 })).toBe('1 h 27 min')
    expect(formatArrival({ minutes: 120 })).toBe('2 h')
    expect(formatArrival({ minutes: 65, estimated: true })).toBe('~1 h 5 min')
  })
})

describe('serverArrivalText', () => {
  it('si todo es del horario programado, sin "~"', () => {
    expect(serverArrivalText({ minutes: 67, estimated: true }, true)).toBe('1 h 7 min')
    expect(serverArrivalText({ minutes: 8, estimated: true }, false)).toBe('~8 min')
    expect(serverArrivalText({ minutes: 8, estimated: false }, false)).toBe('8 min')
  })
})

describe('arrivalDetails / sharedPlatform', () => {
  it('destino si no es el del sentido, andén si no es el de todos, o cancelado', () => {
    expect(arrivalDetails({ minutes: 5, destination: 'Tigre' }, 'Tigre')).toBe(null)
    expect(arrivalDetails({ minutes: 5, destination: 'Bartolomé Mitre', platform: '3' }, 'Tigre')).toBe(
      'a Bartolomé Mitre, andén 3',
    )
    expect(arrivalDetails({ minutes: 5, destination: 'Tigre', platform: '3' }, 'Tigre', '3')).toBe(null)
    expect(arrivalDetails({ minutes: 5, destination: 'Victoria', platform: '2', cancelled: true }, 'Tigre')).toBe(
      'cancelado',
    )
  })

  it('el andén va una vez si todos los que corren salen del mismo', () => {
    expect(sharedPlatform([{ platform: '2' }, { platform: '1', cancelled: true }, { platform: '2' }])).toBe('2')
    expect(sharedPlatform([{ platform: '2' }, { platform: '1' }])).toBe(null)
    expect(sharedPlatform([{ minutes: 3 }, { minutes: 9 }])).toBe(null)
    expect(sharedPlatform([])).toBe(null)
  })
})

describe('tripTrainsPath', () => {
  it('solo las líneas de Trenes Argentinos y entre dos estaciones distintas', () => {
    expect(tripTrainsPath('MITRE', 'Retiro', 'Belgrano C')).toBe(
      '/api/v1/trenes/viaje?linea=MITRE&desde=Retiro&hasta=Belgrano%20C',
    )
    expect(tripTrainsPath('BELGRANO_NORTE', 'Retiro', 'Boulogne Sur Mer')).toBe(null)
    expect(tripTrainsPath('URQUIZA', 'Lacroze', 'Lemos')).toBe(null)
    expect(tripTrainsPath('ROCA', 'Wilde', 'Wilde')).toBe(null)
  })
})

describe('serviceKind', () => {
  it('rápido (y expreso), semirrápido y directo; el resto, sin icono', () => {
    expect(serviceKind('Rápido')).toBe('rapido')
    expect(serviceKind('Expreso')).toBe('rapido')
    expect(serviceKind('Semirrápido')).toBe('semirrapido')
    expect(serviceKind('SEMIRRAPIDO')).toBe('semirrapido')
    expect(serviceKind('Directo')).toBe('directo')
    expect(serviceKind('Diferencial')).toBe(null)
    expect(serviceKind(null)).toBe(null)
  })
})
