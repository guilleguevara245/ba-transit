import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AccessibleBadge from '../components/AccessibleBadge.jsx'
import BackButton from '../components/BackButton.jsx'
import Chevrons from '../components/Chevrons.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LineBadge from '../components/LineBadge.jsx'
import NetworkMap from '../components/NetworkMap.jsx'
import NextTrains from '../components/NextTrains.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useApi } from '../hooks/useApi.js'
import { MODE_LABELS } from '../constants.js'
import { formatLongDate, yearsSince } from '../utils/format.js'
import { findTransfers, routeInfo } from '../utils/map.js'
import { lastTrainsAt, serviceDayType } from '../utils/lastTrain.js'
import './LinePage.css'
import './MapPage.css'
import './StationPage.css'

const DAY_NAMES = ['días hábiles', 'sábados', 'domingos y feriados']

const asLine = (s) => ({ mode: s.lineMode, code: s.lineCode, name: s.lineName, colorHex: s.lineColorHex })

/** Comparte el enlace (menu del celular) o, si no se puede, lo copia. */
function ShareButton({ title }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = window.location.href
    try {
      if (window.navigator.share) {
        await window.navigator.share({ title, url })
        return
      }
      await window.navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // El usuario cerro el menu o no hay permiso para copiar: no pasa nada.
    }
  }

  return (
    <button type="button" className="share-button" onClick={share}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
      </svg>
      {copied ? 'Enlace copiado' : 'Compartir'}
    </button>
  )
}

/**
 * Historia de la estacion y de su linea. Los textos se cargan aparte
 * (import dinamico) para no sumar peso al resto del sitio.
 */
function useStationHistory(lineCode, stationName) {
  const [history, setHistory] = useState(null)
  useEffect(() => {
    let cancelled = false
    setHistory(null)
    if (!lineCode) return undefined
    import('../data/stationHistory.js')
      .then((module) => {
        if (!cancelled) setHistory(module.historyFor(lineCode, stationName))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [lineCode, stationName])
  return history
}

/**
 * Pagina de una estacion: proximos trenes (subte), combinaciones, lugares
 * cercanos, inauguracion, alertas de la linea y su ubicacion en el mapa.
 */
export default function StationPage() {
  const stationId = Number(useParams().stationId)
  const { data: allStations, loading, error } = useApi('/api/v1/map/stations')
  const station = allStations?.find((s) => s.stationId === stationId)
  const alertsState = useApi(station ? `/api/v1/lines/${station.lineId}/alerts` : null, { refreshMs: 60_000 })
  const history = useStationHistory(station?.lineCode, station?.stationName)

  const lineStations = useMemo(
    () => (station ? allStations.filter((s) => s.lineId === station.lineId) : []),
    [allStations, station],
  )

  if (loading) {
    return (
      <div className="wrap content">
        <Skeleton variant="block" label="Cargando estación…" />
        <Skeleton variant="map" label="" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="wrap content">
        <ErrorMessage what="la estación" error={error} />
      </div>
    )
  }
  if (!station) {
    return (
      <div className="wrap content">
        <BackButton />
        <h1 className="page-title">No encontramos esa estación</h1>
        <p className="page-subtitle">Puede que el enlace esté mal escrito o que la estación ya no exista.</p>
      </div>
    )
  }

  const route = routeInfo(allStations, station)
  const transfers = findTransfers(allStations, station)
  const landmarks = (station.landmarks ?? '').split(';').map((p) => p.trim()).filter(Boolean)
  const alerts = alertsState.data ?? []
  const years = yearsSince(station.openedOn)
  const branch = allStations
    .filter((s) => s.branchId === station.branchId)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
  const lastTrains = station.lineMode === 'SUBTE' ? lastTrainsAt(station.lineCode, branch, station) : null

  return (
    <div className="wrap content">
      <BackButton to={`/lineas/${station.lineId}`}>Ver la {station.lineName}</BackButton>

      <div className="line-hero" style={{ '--line-color': station.lineColorHex }}>
        <LineBadge line={asLine(station)} size="lg" />
        <div className="line-hero-text">
          <div className="line-mode">
            {MODE_LABELS[station.lineMode] ?? station.lineMode} · {station.lineName}
          </div>
          <h1 className="line-title">{station.stationName}</h1>
          <div className="line-facts">
            Estación {route.position} de {route.total} · {route.from} ↔ {route.to}
          </div>
          {station.accessible && (
            <div className="station-accessible">
              <AccessibleBadge />
            </div>
          )}
        </div>
        <ShareButton title={`${station.stationName} · ${station.lineName}`} />
      </div>

      <div className="station-layout">
        <div className="station-info">
          {station.lineMode === 'SUBTE' && (
            <section className="station-card">
              <NextTrains lineCode={station.lineCode} stationName={station.stationName} />
            </section>
          )}

          {lastTrains?.length > 0 && (
            <section className="station-card">
              <h2 className="station-card-title">Último tren de hoy</h2>
              <ul className="station-last-trains">
                {lastTrains.map((t) => (
                  <li key={t.towards}>
                    <span>Hacia {t.towards}</span>
                    <strong>≈ {t.time}</strong>
                  </li>
                ))}
              </ul>
              <p className="station-dim station-last-note">
                Horario de {DAY_NAMES[serviceDayType()]} según Emova, estimado para esta estación (±5 min).
              </p>
            </section>
          )}

          {(station.openedOn || history?.station || history?.line) && (
            <section className="station-card station-history">
              <h2 className="station-card-title">Historia</h2>
              {station.openedOn && (
                <p className="station-opened">
                  Inaugurada el {formatLongDate(station.openedOn)}
                  {years > 0 && <span className="station-dim"> · hace {years} años</span>}
                </p>
              )}
              {history?.station && <p>{history.station}</p>}
              {history?.line && (
                <p className="station-history-line">
                  <strong>La {station.lineName}.</strong> {history.line}
                </p>
              )}
            </section>
          )}

          {transfers.length > 0 && (
            <section className="station-card">
              <h2 className="station-card-title">Combinación con</h2>
              <ul className="station-transfers">
                {transfers.map((t) => (
                  <li key={t.stationId}>
                    <Link to={`/estaciones/${t.stationId}`} className="chevrons-host">
                      <LineBadge line={asLine(t)} size="sm" />
                      <span>
                        {t.stationName} <span className="station-dim">· {t.lineName}</span>
                      </span>
                      <Chevrons />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {landmarks.length > 0 && (
            <section className="station-card">
              <h2 className="station-card-title">Cerca</h2>
              <ul className="station-popup-landmarks">
                {landmarks.map((place) => (
                  <li key={place}>{place}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="station-card">
            <h2 className="station-card-title">Estado de la línea</h2>
            {alerts.length === 0 ? (
              <p className="station-ok">Sin alertas activas en la {station.lineName}.</p>
            ) : (
              <ul className="station-alerts">
                {alerts.map((a) => (
                  <li key={a.id}>{a.description}</li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <NetworkMap
          className="station-map"
          stations={lineStations}
          allStations={allStations}
          alerts={alerts}
          focusId={station.stationId}
          openFocusedPopup={false}
        />
      </div>
    </div>
  )
}
