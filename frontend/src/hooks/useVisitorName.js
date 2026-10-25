import { useCallback, useState } from 'react'
import { cleanName } from '../utils/greeting.js'

const STORAGE_KEY = 'ba-transit:nombre'

function readName() {
  try {
    return cleanName(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return ''
  }
}

/**
 * Nombre opcional del visitante para el saludo. Se guarda solo en este
 * navegador (no viaja al servidor).
 */
export function useVisitorName() {
  const [name, setNameState] = useState(readName)

  const setName = useCallback((value) => {
    const clean = cleanName(value)
    try {
      if (clean) window.localStorage.setItem(STORAGE_KEY, clean)
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Sin almacenamiento: el nombre dura hasta recargar.
    }
    setNameState(clean)
  }, [])

  return { name, setName }
}
