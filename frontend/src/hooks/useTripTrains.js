import { useEffect, useState } from 'react'
import { apiGet } from '../api.js'
import { tripTrainsPath } from '../utils/nextTrains.js'
import { isAddress } from '../utils/planner.js'

const REFRESH_MS = 60_000

/** El pedido de los proximos trenes de un tramo (solo a bordo de un tren de Trenes Argentinos). */
function legPath(leg) {
  if (leg.type !== 'ride' || isAddress(leg.from) || isAddress(leg.to) || leg.from.lineMode !== 'TREN') return null
  return tripTrainsPath(leg.from.lineCode, leg.from.stationName, leg.to.stationName)
}

/**
 * Para Como llegar: los proximos trenes de cada tramo en tren de Trenes
 * Argentinos, con hora de salida y de llegada ({ indice del tramo:
 * viajes }). Se vuelven a pedir cada minuto (no con la pestaña oculta);
 * si un pedido falla, queda lo que habia.
 */
export function useTripTrains(legs) {
  const key = (legs ?? []).map(legPath).join('|')
  const [trains, setTrains] = useState({})

  useEffect(() => {
    const wanted = key
      .split('|')
      .map((path, i) => [i, path])
      .filter(([, path]) => path)
    setTrains({})
    if (wanted.length === 0) return undefined
    let cancelled = false
    let timer = null
    let loaded = false

    async function load() {
      if (loaded && document.hidden) {
        timer = setTimeout(load, REFRESH_MS)
        return
      }
      const results = await Promise.all(
        wanted.map(([i, path]) =>
          apiGet(path)
            .then((data) => [i, data?.available ? data.trains : null])
            .catch(() => [i, undefined]),
        ),
      )
      if (cancelled) return
      loaded = true
      setTrains((previous) => {
        const next = {}
        for (const [i, trips] of results) next[i] = trips === undefined ? (previous[i] ?? null) : trips
        return next
      })
      timer = setTimeout(load, REFRESH_MS)
    }

    load()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [key])

  return trains
}
