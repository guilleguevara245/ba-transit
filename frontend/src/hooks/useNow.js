import { useEffect, useState } from 'react'

/**
 * Devuelve la hora actual y fuerza un re-render cada intervalMs. Sirve
 * para que textos como "actualizado hace 3 min" avancen solos.
 */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(interval)
  }, [intervalMs])

  return now
}
