import { useEffect, useState } from 'react'

/**
 * Devuelve una version "retrasada" del valor: solo se actualiza
 * despues de que pasen "delayMs" milisegundos sin que el valor
 * original vuelva a cambiar. Se usa para no mandar un request a la
 * API por cada tecla que el usuario aprieta en el buscador.
 */
export function useDebounce(value, delayMs) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}
