import { useApi } from './useApi.js'
import { gridQuery } from '../utils/weatherPlaces.js'

const REFRESH_MS = 15 * 60_000

/**
 * Tiempo actual en un punto (los aeropuertos), desde el pronostico del
 * servidor (Open-Meteo con cache, el mismo de "Tu dia"): el navegador ya no
 * le pide nada a Open-Meteo. Se refresca cada 15 minutos. Si falla, devuelve
 * error y la pagina sigue funcionando sin el clima.
 */
export function useWeather(latitude, longitude) {
  const { data, error } = useApi(`/api/v1/clima/pronostico?${gridQuery({ lat: latitude, lon: longitude })}`, {
    refreshMs: REFRESH_MS,
  })
  const now = data?.current
  // Si la respuesta no trae numeros validos se trata como error, para no mostrar "NaN°C".
  const valid = now && Number.isFinite(now.temperature) && Number.isFinite(now.wind)
  return {
    data: valid ? { temperature: now.temperature, wind: now.wind, code: now.code, isDay: now.isDay !== false } : null,
    error: error ? String(error.message ?? error) : data && !valid ? 'Sin datos del clima' : null,
  }
}
