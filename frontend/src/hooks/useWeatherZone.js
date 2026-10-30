import { useEffect, useState } from 'react'
import { ZONE_CHANGED, ZONE_KEY, readZone, saveZone } from '../utils/weatherZone.js'

/** La zona del clima, al dia en todos los componentes y pestañas. */
export function useWeatherZone() {
  const [zone, setZone] = useState(readZone)

  useEffect(() => {
    const sync = () => setZone(readZone())
    const onStorage = (event) => {
      if (event.key === null || event.key === ZONE_KEY) sync()
    }
    window.addEventListener(ZONE_CHANGED, sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(ZONE_CHANGED, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return { zone, setZone: saveZone }
}
