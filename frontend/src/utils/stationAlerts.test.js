import { describe, expect, it } from 'vitest'
import { mentionsStation, splitAlertsForStation, stationAliases } from './stationAlerts.js'

const B = ['Leandro N. Alem', 'Florida', 'Carlos Pellegrini', 'Medrano', 'Ángel Gallardo']

describe('mentionsStation', () => {
  it('reconoce el nombre aunque cambien tildes, mayusculas o el "General"', () => {
    expect(mentionsStation('Estación Medrano cerrada por obras de renovación integral.', 'Medrano')).toBe(true)
    expect(mentionsStation('Entre Ríos y Urquiza cerradas por obras', 'General Urquiza')).toBe(true)
    expect(mentionsStation('Entre Rios y Urquiza cerradas por obras', 'Entre Ríos')).toBe(true)
    expect(mentionsStation('Demoras en toda la línea', 'Florida')).toBe(false)
  })

  it('no confunde nombres que contienen a otros', () => {
    expect(mentionsStation('Estación Carlos Pellegrini cerrada', 'Pellegrini')).toBe(true)
    expect(mentionsStation('Estación Floridablanca cerrada', 'Florida')).toBe(false)
  })

  it('con "estacion" en el texto, cuenta lo que viene despues', () => {
    const text = 'Ramales Plaza Constitución – Ezeiza, A. Korn y Bosques vía Temperley: La estación Hipólito Yrigoyen se encuentra cerrada.'
    expect(mentionsStation(text, 'Plaza Constitución')).toBe(false)
    expect(mentionsStation(text, 'Hipólito Yrigoyen')).toBe(true)
  })

  it('separa los nombres dobles', () => {
    expect(stationAliases('Plaza de los Virreyes - Eva Perón')).toContain('eva peron')
  })
})

describe('splitAlertsForStation', () => {
  const alerts = [
    { id: 1, description: 'Estación Medrano cerrada por obras de renovación integral.' },
    { id: 2, description: 'Servicio con demoras por un desperfecto técnico.' },
  ]

  it('en Medrano el cierre es de esta estacion', () => {
    const r = splitAlertsForStation(alerts, { stationName: 'Medrano' }, B)
    expect(r.here.map((a) => a.id)).toEqual([1])
    expect(r.line.map((a) => a.id)).toEqual([2])
    expect(r.elsewhere).toEqual([])
  })

  it('en Florida el cierre de Medrano es de otra estacion', () => {
    const r = splitAlertsForStation(alerts, { stationName: 'Florida' }, B)
    expect(r.here).toEqual([])
    expect(r.elsewhere.map((a) => a.id)).toEqual([1])
    expect(r.line.map((a) => a.id)).toEqual([2])
  })
})

describe('splitAlertsForStation con ramales', () => {
  const alerts = [
    { id: 1, branchId: 7, description: 'El servicio G. Catán circula con demoras por problemas técnicos.' },
    { id: 2, branchId: null, description: 'Servicio con demoras en toda la línea.' },
  ]
  const names = ['Dr. A. Sáenz', 'Tapiales', 'González Catán', 'Marinos del Crucero Gral. Belgrano']

  it('la alerta de un ramal no es de las estaciones de otro', () => {
    const r = splitAlertsForStation(alerts, { stationName: 'Marinos del Crucero Gral. Belgrano' }, names, [8])
    expect(r.line.map((a) => a.id)).toEqual([2])
    expect(r.elsewhere.map((a) => a.id)).toEqual([1])
  })

  it('en una estacion del ramal (o compartida) si cuenta', () => {
    expect(splitAlertsForStation(alerts, { stationName: 'Tapiales' }, names, [7, 8]).line.map((a) => a.id)).toEqual([1, 2])
    // Sin los ramales de la estacion, como antes.
    expect(splitAlertsForStation(alerts, { stationName: 'Tapiales' }, names).line.map((a) => a.id)).toEqual([1, 2])
  })
})
