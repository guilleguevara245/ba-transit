import { useApi } from '../hooks/useApi.js'
import { parseBusShortName } from '../utils/busNames.js'
import { splitLinks } from '../utils/links.js'
import './BusAlerts.css'

const REFRESH_MS = 5 * 60_000

/**
 * Alertas de la API Transporte para una linea de colectivo (por numero,
 * sin cartel). No muestra nada si no hay.
 */
export default function BusAlerts({ shortName }) {
  const { number } = parseBusShortName(shortName)
  const { data } = useApi(number ? `/api/v1/colectivos/alertas?linea=${encodeURIComponent(number)}` : null, {
    refreshMs: REFRESH_MS,
  })
  const alerts = data?.alerts ?? []
  if (alerts.length === 0) return null

  return (
    <section className="bus-alerts" aria-label={`Avisos de la línea ${number}`}>
      {alerts.map((alert, index) => (
        <div className="bus-alert" key={`${alert.title}-${index}`}>
          <div className="bus-alert-kicker">Aviso de la línea</div>
          {alert.title && <div className="bus-alert-title">{alert.title}</div>}
          {alert.description && (
            <p className="bus-alert-text">
              {splitLinks(alert.description).map((part, i) =>
                part.url ? (
                  <a key={i} href={part.url} target="_blank" rel="noreferrer">
                    {part.text}
                  </a>
                ) : (
                  <span key={i}>{part.text}</span>
                ),
              )}
            </p>
          )}
          <div className="bus-alert-source">Fuente: API Transporte (Gobierno de la Ciudad)</div>
        </div>
      ))}
    </section>
  )
}
