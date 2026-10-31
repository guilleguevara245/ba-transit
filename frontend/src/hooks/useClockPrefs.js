import { useEffect, useState } from 'react'
import { CLOCK_CHANGED, CLOCK_KEY, readClock, saveClock } from '../utils/clockPrefs.js'

/** Como se muestra el reloj, al dia en todas las pestañas. */
export function useClockPrefs() {
  const [clock, setClock] = useState(readClock)

  useEffect(() => {
    const sync = (event) => setClock(event?.detail ?? readClock())
    const onStorage = (event) => {
      if (event.key === null || event.key === CLOCK_KEY) setClock(readClock())
    }
    window.addEventListener(CLOCK_CHANGED, sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CLOCK_CHANGED, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return { clock, setClock: saveClock }
}
