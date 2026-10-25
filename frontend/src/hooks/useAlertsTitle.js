import { useEffect } from 'react'
import { useApi } from './useApi.js'

const BASE_TITLE = 'BA Transit'

/** "(3) BA Transit" con 3 alertas activas; "BA Transit" sin alertas. */
export function titleWithAlerts(count) {
  return count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE
}

/**
 * Muestra la cantidad de alertas activas en el titulo de la pestaña,
 * para verlas aunque la pestaña este en segundo plano. Se refresca cada
 * minuto, igual que el panel de alertas.
 */
export function useAlertsTitle() {
  const { data: alerts } = useApi('/api/v1/alerts', { refreshMs: 60_000 })

  useEffect(() => {
    if (alerts) {
      document.title = titleWithAlerts(alerts.length)
    }
  }, [alerts])
}
