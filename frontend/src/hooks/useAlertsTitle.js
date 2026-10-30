import { useEffect } from 'react'
import { useApi } from './useApi.js'
import { useFavoriteList } from './useFavoriteList.js'
import { favoriteAlertCount, titleWithAlerts } from '../utils/alertsTitle.js'

/**
 * Muestra en el titulo de la pestaña cuantas alertas tocan tus lineas y
 * estaciones favoritas, para verlas aunque la pestaña este en segundo
 * plano. Se refresca cada minuto, igual que el panel de alertas.
 */
export function useAlertsTitle() {
  const { data: alerts } = useApi('/api/v1/alerts', { refreshMs: 60_000 })
  const lines = useFavoriteList('lineas').ids
  const stationIds = useFavoriteList('estaciones').ids
  // Las estaciones solo se piden si hay alguna favorita (para saber su linea).
  const { data: stations } = useApi(stationIds.length > 0 ? '/api/v1/map/stations' : null)

  useEffect(() => {
    if (!alerts) return
    const stationLines = (stations ?? []).filter((s) => stationIds.includes(s.stationId)).map((s) => s.lineId)
    document.title = titleWithAlerts(favoriteAlertCount(alerts, [...lines, ...stationLines]))
  }, [alerts, lines, stationIds, stations])
}
