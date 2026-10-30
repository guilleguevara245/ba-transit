import { describe, expect, it } from 'vitest'
import { errorLabel, lastAttemptFailed, statusSummary } from './status.js'

describe('statusSummary', () => {
  it('todas bien (las que no se consultaron no cuentan como falla)', () => {
    expect(statusSummary([{ status: 'OK' }, { status: 'SIN_DATOS' }]).tone).toBe('ok')
  })

  it('una o varias fallando', () => {
    expect(statusSummary([{ status: 'ERROR', what: 'Estado del Urquiza' }, { status: 'OK' }])).toEqual({
      tone: 'error',
      text: 'Estado del Urquiza: la fuente no está respondiendo.',
    })
    expect(statusSummary([{ status: 'ERROR' }, { status: 'ERROR' }]).text).toBe('2 fuentes no están respondiendo.')
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
