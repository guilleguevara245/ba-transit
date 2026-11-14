import { describe, expect, it } from 'vitest'
import { errorLabel, lastAttemptFailed, standbyFor, statusGroups, statusSummary } from './status.js'

describe('statusSummary', () => {
  it('todas bien (las que no se consultaron no cuentan como falla)', () => {
    expect(statusSummary([{ status: 'OK' }, { status: 'SIN_DATOS' }]).tone).toBe('ok')
  })

  it('una o varias fallando', () => {
    expect(statusSummary([{ status: 'ERROR', what: 'Estado del Urquiza' }, { status: 'OK' }])).toEqual({
      tone: 'error',
      title: 'Estado del Urquiza: con problemas',
      text: 'Mientras tanto, el sitio muestra los últimos datos que tiene.',
    })
    expect(statusSummary([{ status: 'ERROR' }, { status: 'ERROR' }]).title).toBe('2 servicios con problemas')
  })
})

describe('statusGroups', () => {
  const sources = [
    { key: 'subte-alertas', what: 'Alertas del subte', status: 'OK' },
    { key: 'subte-horario', what: 'Horario programado del subte', status: 'ERROR' },
    { key: 'ferrovias', what: 'Próximos trenes del Belgrano Norte', status: 'SIN_DATOS' },
    { key: 'nueva', what: 'Fuente nueva', status: 'OK' },
  ]

  it('agrupa con nombres cortos y el peor estado de cada grupo', () => {
    const groups = statusGroups(sources)
    expect(groups.map((g) => [g.id, g.status])).toEqual([
      ['subte', 'ERROR'],
      ['trenes', 'SIN_DATOS'],
      ['otros', 'OK'],
    ])
    expect(groups[0].sources.map((s) => s.name)).toEqual(['Alertas de GCBA', 'Próximas formaciones del subte'])
    expect(groups[2].sources[0].name).toBe('Fuente nueva')
  })

  it('las de Trenes Argentinos van en Trenes', () => {
    const groups = statusGroups([
      { key: 'ferrovias', what: 'Próximos trenes del Belgrano Norte', status: 'OK' },
      { key: 'trenes-sofse-alertas', what: 'Alertas de Trenes Argentinos', status: 'OK' },
      { key: 'trenes-sofse', what: 'Próximos trenes de Trenes Argentinos', status: 'OK' },
    ])
    expect(groups.map((g) => g.id)).toEqual(['trenes'])
    expect(groups[0].sources.map((s) => s.name)).toEqual([
      'Próximos trenes del Belgrano Norte',
      'Alertas de Trenes Argentinos',
      'Próximos trenes de Trenes Argentinos',
    ])
  })

  it('sin fuentes, sin grupos', () => {
    expect(statusGroups([])).toEqual([])
  })
})

describe('pronostico y su respaldo', () => {
  const smn = { key: 'smn', what: 'Alertas meteorológicas', status: 'OK' }
  const openMeteo = (status, lastSuccess) => ({
    key: 'pronostico',
    what: 'Pronóstico del clima (Open-Meteo)',
    provider: 'Open-Meteo',
    status,
    lastSuccess,
  })
  const met = (status, lastSuccess) => ({
    key: 'pronostico-respaldo',
    what: 'Pronóstico del clima de respaldo (MET Norway)',
    provider: 'MET Norway (Instituto Meteorológico de Noruega)',
    status,
    lastSuccess,
  })

  it('cada fuente en su fila, dentro de Clima', () => {
    const [clima] = statusGroups([smn, openMeteo('OK', '2026-11-14T16:00:00Z'), met('SIN_DATOS', null)])
    expect(clima.sources.map((s) => s.name)).toEqual([
      'Alertas del SMN',
      'Pronóstico (Open-Meteo)',
      'Pronóstico de respaldo (MET Norway)',
    ])
  })

  it('con Open-Meteo funcionando, MET Norway queda en espera y no cuenta', () => {
    const sources = [smn, openMeteo('OK', '2026-11-14T16:00:00Z'), met('ERROR', '2026-11-14T12:00:00Z')]
    expect(standbyFor(sources[2], sources)).toBe('Open-Meteo')
    expect(statusGroups(sources)[0].status).toBe('OK')
    expect(statusSummary(sources).tone).toBe('ok')
  })

  it('con Open-Meteo caido, Clima tiene problemas y se avisa que se usa el respaldo', () => {
    const sources = [smn, openMeteo('ERROR', null), met('OK', '2026-11-14T16:39:00Z')]
    expect(standbyFor(sources[2], sources)).toBeNull()
    expect(statusGroups(sources)[0].status).toBe('ERROR')
    expect(statusSummary(sources)).toEqual({
      tone: 'error',
      title: 'Pronóstico del clima (Open-Meteo): con problemas',
      text: 'Mientras tanto, se usa el respaldo: MET Norway (Instituto Meteorológico de Noruega).',
    })
  })

  it('si el respaldo respondio despues de un intento fallido de Open-Meteo, no esta en espera', () => {
    const sources = [openMeteo('OK', '2026-11-14T16:00:00Z'), met('OK', '2026-11-14T16:05:00Z')]
    expect(standbyFor(sources[1], sources)).toBeNull()
  })
})

describe('errorLabel', () => {
  it('traduce los motivos tecnicos', () => {
    expect(errorLabel('SocketTimeoutException')).toBe('tardó demasiado en responder')
    expect(errorLabel('ConnectException')).toBe('no se pudo conectar')
    expect(errorLabel('HTTP 503')).toBe('error del servidor (HTTP 503)')
    expect(errorLabel('HTTP 401')).toBe('rechazó la consulta (HTTP 401)')
    expect(errorLabel('HTTP 403: la IP del servidor no está autorizada en Brevo')).toBe(
      'la IP del servidor no está autorizada en Brevo (HTTP 403)',
    )
    expect(errorLabel('sin respuesta')).toBe('sin respuesta')
    expect(errorLabel(null)).toBe(null)
  })
})

describe('lastAttemptFailed', () => {
  it('solo cuando funciona y la falla es posterior al ultimo exito', () => {
    const base = { status: 'OK', lastSuccess: '2026-10-26T21:40:00Z' }
    expect(lastAttemptFailed({ ...base, lastFailure: '2026-10-26T21:41:00Z' })).toBe(true)
    expect(lastAttemptFailed({ ...base, lastFailure: '2026-10-26T21:30:00Z' })).toBe(false)
    expect(lastAttemptFailed(base)).toBe(false)
    expect(lastAttemptFailed({ ...base, status: 'ERROR', lastFailure: '2026-10-26T21:41:00Z' })).toBe(false)
  })
})
