import { useCallback, useState } from 'react'

const STORAGE_KEY = 'ba-transit:estaciones-favoritas'

function read() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Estacion elegida para cada linea favorita ({ idDeLinea: nombre }), para
 * mostrar sus proximos trenes en "Mis lineas". Se guarda en el navegador.
 */
export function useFavoriteStations() {
  const [stations, setStations] = useState(read)

  const setStation = useCallback((lineId, stationName) => {
    const next = { ...read() }
    if (stationName) next[lineId] = stationName
    else delete next[lineId]
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Sin almacenamiento: la eleccion dura hasta recargar.
    }
    setStations(next)
  }, [])

  return { stations, setStation }
}
