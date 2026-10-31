import { useEffect, useState } from 'react'
import { apiGet } from '../api.js'
import { ADDRESS_DEBOUNCE_MS, addressQuery } from '../utils/addressSearch.js'

const IDLE = { status: 'idle', results: [] }

/**
 * Sugerencias de direcciones (Georef, a traves del servidor) para el
 * texto escrito: espera a que se deje de tipear y descarta respuestas
 * viejas. status: 'idle' (muy corto o apagado), 'loading', 'results',
 * 'empty' (no se encontro en el AMBA) o 'error' (Georef no responde o
 * demasiadas busquedas).
 */
export function useAddressSearch(text, enabled = true) {
  const query = enabled ? addressQuery(text) : null
  const [state, setState] = useState(IDLE)

  useEffect(() => {
    if (!query) {
      setState(IDLE)
      return undefined
    }
    let cancelled = false
    setState((prev) => ({ status: 'loading', results: prev.results }))
    const timer = setTimeout(() => {
      apiGet(`/api/v1/direcciones?q=${encodeURIComponent(query)}`)
        .then((results) => {
          if (cancelled) return
          const list = Array.isArray(results) ? results : []
          setState({ status: list.length > 0 ? 'results' : 'empty', results: list })
        })
        .catch(() => {
          if (!cancelled) setState({ status: 'error', results: [] })
        })
    }, ADDRESS_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  return state
}
