import { useEffect, useState } from 'react'
import { weatherUrl } from '../utils/weather.js'

const REFRESH_MS = 15 * 60_000

/**
 * Tiempo actual en un punto, desde Open-Meteo (gratis, sin clave y con
 * CORS habilitado, asi que se pide directo desde el navegador). Se
 * refresca cada 15 minutos. Si falla, devuelve error y la pagina sigue
 * funcionando sin el clima.
 */
export function useWeather(latitude, longitude) {
  const [state, setState] = useState({ data: null, error: null })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch(weatherUrl(latitude, longitude))
        if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}`)
        const json = await response.json()
        const current = json?.current ?? {}
        // Si la respuesta no trae numeros validos se trata como error, para
        // no mostrar "NaN°C".
        if (!Number.isFinite(current.temperature_2m) || !Number.isFinite(current.wind_speed_10m)) {
          throw new Error('Respuesta de Open-Meteo sin datos actuales')
        }
        if (!cancelled) {
          setState({
            data: {
              temperature: current.temperature_2m,
              wind: current.wind_speed_10m,
              code: current.weather_code,
              // is_day: 1 de dia, 0 de noche (si falta, se asume de dia).
              isDay: current.is_day !== 0,
            },
            error: null,
          })
        }
      } catch (err) {
        if (!cancelled) setState((prev) => ({ ...prev, error: err.message }))
      }
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [latitude, longitude])

  return state
}
