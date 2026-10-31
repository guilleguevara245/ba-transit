import { describe, expect, it } from 'vitest'
import { errorLabel, lastAttemptFailed, statusGroups, statusSummary } from './status.js'

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
    expect(groups[0].sources.map((s) => s.name)).toEqual(['Alertas', 'Horarios programados'])
    expect(groups[2].sources[0].name).toBe('Fuente nueva')
  })

  it('sin fuentes, sin grupos', () => {
    expect(statusGroups([])).toEqual([])
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
