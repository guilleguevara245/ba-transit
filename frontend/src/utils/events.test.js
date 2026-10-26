import { describe, expect, it } from 'vitest'
import { eventWhen, eventsNear, eventsOnAccesses, prettyStreets } from './events.js'

const now = new Date('2026-10-25T22:00:00-03:00')

describe('eventWhen', () => {
  it('describe cuando es', () => {
    expect(eventWhen({ startsAt: '2026-10-26T18:00:00-03:00', endsAt: '2026-10-26T23:00:00-03:00' }, now)).toBe(
      'Mañana de 18:00 a 23:00',
    )
    expect(eventWhen({ startsAt: '2027-03-13T08:00:00-03:00', endsAt: null }, now)).toBe('Desde el 13 de marzo a las 08:00')
    expect(eventWhen({ startsAt: '2026-10-20T08:00:00-03:00', endsAt: '2026-11-30T18:00:00-03:00' }, now)).toBe(
      'En curso hasta el 30 de noviembre',
    )
  })
})

describe('prettyStreets', () => {
  it('pasa de mayusculas a nombre propio', () => {
    expect(prettyStreets('HUMBOLDT · AV CORRIENTES')).toBe('Humboldt · Av Corrientes')
    expect(prettyStreets('Av. del Libertador')).toBe('Av. del Libertador')
  })
})

describe('eventsNear / eventsOnAccesses', () => {
  const recital = { id: 'a', latitude: -34.5939, longitude: -58.4472 }
  const lejos = { id: 'b', latitude: -34.7, longitude: -58.3 }
  const manual = { id: 'c', affectsAccesses: true }

  it('filtra por distancia a la estacion', () => {
    expect(eventsNear([recital, lejos, manual], { latitude: -34.5918, longitude: -58.4475 }).map((e) => e.id)).toEqual(['a'])
  })

  it('detecta los que tocan un acceso', () => {
    const accesses = [{ name: 'Acceso Oeste', segments: [{ geometry: [[-34.594, -58.448]] }] }]
    expect(eventsOnAccesses([recital, lejos, manual], accesses)).toEqual([
      { event: recital, access: 'Acceso Oeste' },
      { event: manual, access: null },
    ])
  })
})
