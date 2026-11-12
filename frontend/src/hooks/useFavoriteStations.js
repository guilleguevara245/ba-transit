import { useCallback, useState } from 'react'

/** Donde se guardaba antes la eleccion (se borra: ya no se recuerda). */
const OLD_STORAGE_KEY = 'ba-transit:estaciones-favoritas'

function forgetOldChoice() {
  try {
    window.localStorage.removeItem(OLD_STORAGE_KEY)
  } catch {
    // Sin almacenamiento: no hay nada que borrar.
  }
}

/** La eleccion en memoria: sobrevive a ir y volver entre paginas, no a recargar. */
let memory = null

/**
 * Estacion elegida en cada linea de "Mis lineas" ({ idDeLinea: nombre }),
 * para ver sus proximos trenes. Dura mientras el sitio esta abierto (aunque
 * se vaya a otra pagina y se vuelva): al recargar vuelve a "Elegí tu
 * estación…". Para tener una estacion siempre a mano esta "Mis
 * estaciones" (la estrella de la estacion).
 */
export function useFavoriteStations() {
  const [stations, setStations] = useState(() => {
    if (memory === null) {
      forgetOldChoice()
      memory = {}
    }
    return memory
  })

  const setStation = useCallback((lineId, stationName) => {
    const next = { ...memory }
    if (stationName) next[lineId] = stationName
    else delete next[lineId]
    memory = next
    setStations(next)
  }, [])

  return { stations, setStation }
}
