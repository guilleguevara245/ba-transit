import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AccessibleBadge from '../components/AccessibleBadge.jsx'
import BackButton, { BackTrail } from '../components/BackButton.jsx'
import Chevrons from '../components/Chevrons.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LineBadge from '../components/LineBadge.jsx'
import NetworkMap from '../components/NetworkMap.jsx'
import NextTrains from '../components/NextTrains.jsx'
import { busParams } from '../utils/busNames.js'
import Skeleton from '../components/Skeleton.jsx'
import { useApi } from '../hooks/useApi.js'
import { MODE_LABELS, MODE_LABELS_PLURAL, MODE_SLUGS } from '../constants.js'
import { formatLongDate, yearsSince } from '../utils/format.js'
import { findTransfers, stationBranches } from '../utils/map.js'
import { lastTrainsAt, serviceDayType } from '../utils/lastTrain.js'
import { eventsNear } from '../utils/events.js'
import { splitAlertsForStation } from '../utils/stationAlerts.js'
import { readableTextColor } from '../utils/color.js'
import EventCard from '../components/EventCard.jsx'
import './ModePage.css'
import './LinePage.css'
import './MapPage.css'
import './StationPage.css'
import { findStation, linePath, stationPath } from '../utils/lineSlug.js'

/** Paradas de colectivo a esta distancia cuentan como cerca de la estacion. */
const BUS_RADIUS_M = 300

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
  // /estaciones/subte-b/medrano; los links viejos (/estaciones/27) se cambian por la nueva.
  const { lineRef, stationRef } = useParams()
  const navigate = useNavigate()
  const { data: allStations, loading, error } = useApi('/api/v1/map/stations')
  const station = findStation(allStations, lineRef, stationRef)
  useEffect(() => {
    if (station && stationRef == null) {
      const path = stationPath(station)
      if (path !== `/estaciones/${lineRef}`) navigate(path, { replace: true })
    }
  }, [station, lineRef, stationRef, navigate])
  const alertsState = useApi(station ? `/api/v1/lines/${station.lineId}/alerts` : null, { refreshMs: 60_000 })
  const history = useStationHistory(station?.lineCode, station?.stationName)
  const eventsState = useApi(station ? '/api/v1/eventos' : null, { refreshMs: 10 * 60_000 })
  const busesState = useApi(
    station ? `/api/v1/colectivos/cerca?lat=${station.latitude}&lon=${station.longitude}&radio=${BUS_RADIUS_M}` : null,
  )

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

  // Las estaciones compartidas entre ramales (Roca, Mitre) muestran todos.
  const branches = stationBranches(allStations, station)
  const transfers = findTransfers(allStations, station)
  const landmarks = (station.landmarks ?? '').split(';').map((p) => p.trim()).filter(Boolean)
  const alerts = alertsState.data ?? []
  // Las alertas que nombran una estacion (por ejemplo "Estacion Medrano
  // cerrada") se muestran como aviso de esa estacion, no de toda la linea.
  const alertSplit = splitAlertsForStation(alerts, station, lineStations.map((s) => s.stationName))
  const closed = alertSplit.here.some((a) => /cerrad/i.test(a.description ?? ''))
  const years = yearsSince(station.openedOn)
  const branch = allStations
    .filter((s) => s.branchId === station.branchId)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
  // Una ficha por numero de linea ("53A" y "53B" quedan como dos carteles distintos).
  const nearbyBuses = []
  for (const bus of busesState.data ?? []) {
    if (bus.shortName && !nearbyBuses.some((b) => b.shortName === bus.shortName)) nearbyBuses.push(bus)
  }
  const nearbyEvents = eventsNear(eventsState.data?.events, station)
  const lastTrains = station.lineMode === 'SUBTE' ? lastTrainsAt(station.lineCode, branch, station) : null

  return (
    <div className="wrap content">
      <BackTrail
        links={[
          { to: linePath({ id: station.lineId, mode: station.lineMode, code: station.lineCode }), label: `Volver a la ${station.lineName}` },
          ...(MODE_SLUGS[station.lineMode]
            ? [{ to: `/red/${MODE_SLUGS[station.lineMode]}`, label: `Volver a ${MODE_LABELS_PLURAL[station.lineMode]}` }]
            : []),
        ]}
      />

      <div className="line-hero" style={{ '--line-color': station.lineColorHex }}>
        <LineBadge line={asLine(station)} size="lg" />
        <div className="line-hero-text">
          <div className="line-mode">
            {MODE_LABELS[station.lineMode] ?? station.lineMode} · {station.lineName}
          </div>
          <h1 className="line-title">{station.stationName}</h1>
          <div className="line-facts">
            {branches.length === 1 ? (
              <>
                Estación {branches[0].position} de {branches[0].total} · {branches[0].from} ↔ {branches[0].to}
              </>
            ) : (
              <>
                Parada de {branches.length} ramales:
                <ul className="station-branches">
                  {/* Bosques vía Quilmes y vía Temperley tienen las mismas cabeceras: se muestra una vez. */}
                  {[...new Set(branches.map((b) => `${b.from} ↔ ${b.to}`))].map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {(station.accessible || alertSplit.here.length > 0) && (
            <div className="station-accessible">
              {alertSplit.here.length > 0 && (
                <span className={closed ? 'station-flag closed' : 'station-flag'}>
                  {closed ? 'Estación cerrada' : 'Aviso en esta estación'}
                </span>
              )}
              {station.accessible && <AccessibleBadge />}
            </div>
          )}
        </div>
        <ShareButton title={`${station.stationName} · ${station.lineName}`} />
      </div>

      <div className="station-layout">
        <div className="station-info">
          {alertSplit.here.length > 0 && (
            <section className="station-card station-here-alert">
              <h2 className="station-card-title">Aviso en esta estación</h2>
              <ul className="station-alerts">
                {alertSplit.here.map((a) => (
                  <li key={a.id}>{a.description}</li>
                ))}
              </ul>
            </section>
          )}

          <NextTrains mode={station.lineMode} lineCode={station.lineCode} stationName={station.stationName} asCard />

          {nearbyEvents.length > 0 && (
            <section className="station-card station-events">
              <h2 className="station-card-title">Eventos y cortes cerca</h2>
              {nearbyEvents.slice(0, 3).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  compact
                  extra={`A unos ${Math.round(event.distanceKm * 10) * 100} m de la estación · puede haber más gente o cambios de servicio`}
                />
              ))}
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
                    <Link to={stationPath(t)} className="chevrons-host">
                      <LineBadge line={asLine(t)} size="sm" />
                      <span className="station-transfer-name">
                        {t.stationName} <span className="station-dim">· {t.lineName}</span>
                      </span>
                      <Chevrons />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {nearbyBuses.length > 0 && (
            <section className="station-card">
              <h2 className="station-card-title">Colectivos a menos de {BUS_RADIUS_M} m</h2>
              <div className="station-buses">
                {nearbyBuses.map((bus) => (
                  <Link
                    key={bus.id}
                    to={`/colectivos?${new URLSearchParams(busParams(bus.shortName, bus.id))}`}
                    className="station-bus"
                    style={bus.color ? { background: bus.color, color: readableTextColor(bus.color) } : undefined}
                    title={`Línea ${bus.shortName} · parada a unos ${Math.max(50, Math.round(bus.meters / 50) * 50)} m`}
                  >
                    {bus.shortName}
                  </Link>
                ))}
              </div>
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
            {alertSplit.line.length === 0 ? (
              <p className="station-ok">
                {alertSplit.here.length > 0 || alertSplit.elsewhere.length > 0
                  ? `El resto de la ${station.lineName} funciona con normalidad.`
                  : `Sin alertas activas en la ${station.lineName}.`}
              </p>
            ) : (
              <ul className="station-alerts">
                {alertSplit.line.map((a) => (
                  <li key={a.id}>{a.description}</li>
                ))}
              </ul>
            )}
            {alertSplit.elsewhere.length > 0 && (
              <div className="station-elsewhere">
                <span>En otras estaciones de la línea</span>
                <ul>
                  {alertSplit.elsewhere.map((a) => (
                    <li key={a.id}>{a.description}</li>
                  ))}
                </ul>
              </div>
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
