import { useEffect, useState } from 'react'
import { OPENSKY_URL, parseOpenSky } from '../utils/flights.js'

// Sin cuenta, OpenSky da 400 consultas por dia a cada conexion: una por minuto alcanza.
const REFRESH_MS = 60_000

/**
 * Aviones pedidos directo a OpenSky desde el navegador, cuando el servidor
 * no los tiene (ver utils/flights.js). Devuelve { data, error } con el
 * mismo formato que /api/v1/vuelos; con enabled en false no pide nada.
 */
export function useBrowserFlights(enabled) {
  const [state, setState] = useState({ data: null, error: null })

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    let timer = null

    async function load() {
      if (!document.hidden) {
        try {
          const response = await fetch(OPENSKY_URL)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const body = await response.json()
          if (!cancelled) {
            setState({
              data: { registered: false, refreshSeconds: 60, updatedAt: new Date().toISOString(), flights: parseOpenSky(body) },
              error: null,
            })
          }
        } catch (error) {
          if (!cancelled) setState((current) => ({ data: current.data, error }))
        }
      }
      if (!cancelled) timer = setTimeout(load, REFRESH_MS)
    }

    load()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [enabled])

  return state
}
