import TravelTimeCard from '../components/TravelTimeCard.jsx'
import Chevrons from '../components/Chevrons.jsx'
import SpecialServices from '../components/SpecialServices.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AlertsPanel from '../components/AlertsPanel.jsx'
import BackButton, { BackTrail } from '../components/BackButton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import LineBadge from '../components/LineBadge.jsx'
import LineInfoCard from '../components/LineInfoCard.jsx'
import NetworkMap from '../components/NetworkMap.jsx'
import { useApi } from '../hooks/useApi.js'
import { MODE_LABELS, MODE_LABELS_PLURAL, MODE_SLUGS } from '../constants.js'
import { mentionsStation } from '../utils/stationAlerts.js'
import { findLine, lineSlug, stationPath } from '../utils/lineSlug.js'
import '../components/Panels.css'
import './LinePage.css'

function BranchStations({ branch, line, selected, onSelect, locatedIds, alerts = [] }) {
  const { data: stations, loading, error } = useApi(`/api/v1/branches/${branch.id}/stations`)
  const selectedRef = useRef(null)

  // Solo se hace scroll cuando la estacion llega por la URL (desde la
  // busqueda); si se elige en el minimapa, la lista no salta.
  useEffect(() => {
    if (selected.fromUrl) {
      selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [stations, selected])

  return (
    <div className="panel">
      <div className="panel-title">
        {branch.name}
        {stations && <span className="count">{stations.length} estaciones</span>}
      </div>

      {loading && <Skeleton variant="list" count={8} label="Cargando estaciones…" />}
      {error && <ErrorMessage what="las estaciones" error={error} />}

      {stations && stations.length === 0 && (
        <div className="loading-text">Todavía no hay estaciones cargadas para este ramal.</div>
      )}

      {stations && stations.length > 0 && (
        <ol className="station-list" style={{ '--line-color': line.colorHex }}>
          {stations.map((station) => {
            const isSelected = station.id === selected.id
            const located = locatedIds.has(station.id)
            const classes = ['station-item', isSelected && 'highlighted', located && 'selectable'].filter(Boolean)
            return (
              <li
                key={station.id}
                ref={isSelected ? selectedRef : undefined}
                className={classes.join(' ')}
                onClick={located ? () => onSelect(station.id) : undefined}
              >
                <span className="station-dot"></span>
                <span className="station-name">{station.name}</span>
                {(() => {
                  // Aviso que nombra a esta estacion (por ejemplo, "Estacion Medrano cerrada").
                  const notice = alerts.find((a) => mentionsStation(`${a.title ?? ''} ${a.description ?? ''}`, station.name))
                  if (!notice) return null
                  const closed = /cerrad/i.test(notice.description ?? '')
                  return (
                    <span className={closed ? 'station-flag-mini closed' : 'station-flag-mini'} title={notice.description}>
                      {closed ? 'Cerrada' : 'Aviso'}
                    </span>
                  )
                })()}
                {isSelected && located && (
                  <Link
                    className="station-item-link chevrons-host"
                    to={stationPath({ stationId: station.id, stationName: station.name, lineMode: line.mode, lineCode: line.code })}
                    onClick={(event) => event.stopPropagation()}
                  >
                    Ver estación <Chevrons />
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default function LinePage() {
  // La direccion es /lineas/subte-b o /lineas/san-martin; los links viejos
  // con el id (/lineas/10) siguen andando y se reemplazan por la nueva.
  const { lineId: lineRef } = useParams()
  const navigate = useNavigate()
  const { data: allLinesList } = useApi('/api/v1/lines')
  const isNumericRef = /^\d+$/.test(lineRef ?? '')
  const lineId = isNumericRef ? lineRef : (findLine(allLinesList, lineRef)?.id ?? null)
  const lineNotFound = !isNumericRef && Array.isArray(allLinesList) && lineId == null
  const [searchParams] = useSearchParams()
  const urlStationId = Number(searchParams.get('estacion')) || null
  const [selected, setSelected] = useState({ id: urlStationId, fromUrl: true })
  const mapRef = useRef(null)
  // Posicion de la lista antes de subir al mapa, para el boton "Volver a la lista".
  const [listScroll, setListScroll] = useState(null)

  // Al tocar una estacion de la lista: en pantallas angostas el mapa queda
  // arriba de la lista, asi que se sube hasta el para verla (y se recuerda
  // donde estaba la lista, para poder volver).
  function selectFromList(id) {
    setSelected({ id, fromUrl: false })
    if (mapRef.current && window.matchMedia('(max-width: 900px)').matches) {
      setListScroll(window.scrollY)
      mapRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function backToList() {
    window.scrollTo({ top: listScroll ?? 0, behavior: 'smooth' })
    setListScroll(null)
  }

  useEffect(() => {
    setSelected({ id: urlStationId, fromUrl: true })
  }, [urlStationId, lineId])

  const lineState = useApi(lineId ? `/api/v1/lines/${lineId}` : null)
  const branchesState = useApi(lineId ? `/api/v1/lines/${lineId}/branches` : null)
  const alertsState = useApi(lineId ? `/api/v1/lines/${lineId}/alerts` : null, { refreshMs: 60_000 })

  const line = lineState.data

  // Link viejo con el id: se cambia la direccion por la legible, sin recargar.
  useEffect(() => {
    const slug = line && lineSlug(line)
    if (isNumericRef && slug) {
      navigate({ pathname: `/lineas/${slug}`, search: window.location.search }, { replace: true })
    }
  }, [isNumericRef, line, navigate])
  // Estaciones del mismo modo con coordenadas: las de esta linea van al
  // minimapa y el resto sirve para mostrar combinaciones en el popup.
  const modeStationsState = useApi(line ? `/api/v1/map/stations?mode=${line.mode}` : null)
  const modeStations = useMemo(() => modeStationsState.data ?? [], [modeStationsState.data])
  const lineStations = useMemo(
    () => modeStations.filter((s) => String(s.lineId) === String(lineId)),
    [modeStations, lineId],
  )
  const locatedIds = useMemo(() => new Set(lineStations.map((s) => s.stationId)), [lineStations])
  const hasMap = lineStations.length > 0
  // Para mostrar los badges de las lineas con las que combina.
  // Subte y premetro combinan entre si: hacen falta todas las lineas para los badges.
  const isMetro = line?.mode === 'SUBTE' || line?.mode === 'PREMETRO'
  const allLines = isMetro ? allLinesList : null

  return (
    <div className="wrap content">
      {line && MODE_SLUGS[line.mode] ? (
        <BackTrail
          links={[
            { to: `/red/${MODE_SLUGS[line.mode]}`, label: `Volver a ${MODE_LABELS_PLURAL[line.mode]}` },
            { to: '/', label: 'Volver al inicio' },
          ]}
        />
      ) : (
        <BackButton />
      )}

      {lineNotFound && (
        <>
          <h1 className="page-title">No encontramos esa línea</h1>
          <p className="page-subtitle">Puede que el enlace esté mal escrito. Buscala desde el inicio o el mapa.</p>
        </>
      )}
      {((!lineId && !lineNotFound) || lineState.loading) && <Skeleton variant="block" label="Cargando línea…" />}
      {lineState.error && <ErrorMessage what="la línea" error={lineState.error} />}

      {line && (
        <>
          <div className="line-hero" style={{ '--line-color': line.colorHex }}>
            <LineBadge line={line} size="lg" />
            <div className="line-hero-text">
              <div className="line-mode">{MODE_LABELS[line.mode] ?? line.mode}</div>
              <h1 className="line-title">{line.name}</h1>
              {branchesState.data && (
                <div className="line-facts">
                  {branchesState.data.length} {branchesState.data.length === 1 ? 'ramal' : 'ramales'}
                  {alertsState.data && (
                    <>
                      {' · '}
                      {alertsState.data.length === 0
                        ? 'Sin alertas activas'
                        : `${alertsState.data.length} ${alertsState.data.length === 1 ? 'alerta activa' : 'alertas activas'}`}
                    </>
                  )}
                </div>
              )}
            </div>
            <FavoriteButton lineId={line.id} lineName={line.name} />
          </div>

          {alertsState.data && alertsState.data.length > 0 && (
            <div className="line-section">
              <AlertsPanel alerts={alertsState.data} lines={[line]} />
            </div>
          )}

          <SpecialServices lineId={line.id} />
          <div className="section-label">Ramales y estaciones</div>
          {branchesState.error && <ErrorMessage what="los ramales" error={branchesState.error} />}
          {branchesState.data && branchesState.data.length === 0 && (
            <div className="loading-text">Esta línea todavía no tiene estaciones cargadas.</div>
          )}

          <div className="line-layout">
            <div className="branches">
              {branchesState.data?.map((branch) => (
                <BranchStations
                  key={branch.id}
                  branch={branch}
                  line={line}
                  selected={selected}
                  onSelect={selectFromList}
                  locatedIds={locatedIds}
                  alerts={alertsState.data ?? []}
                />
              ))}
            </div>

            {/* Columna derecha: siempre el mismo formato, con el minimapa
                (si hay coordenadas) y debajo la informacion de la linea. */}
            <aside className="line-side">
              {hasMap && (
                <div ref={mapRef} className="line-minimap-wrap">
                  <NetworkMap
                    className="line-minimap"
                    stations={lineStations}
                    allStations={modeStations}
                    alerts={alertsState.data ?? []}
                    focusId={selected.id}
                    onSelect={(id) => {
                      setSelected({ id, fromUrl: false })
                      setListScroll(null)
                    }}
                  />
                  <p className="line-minimap-hint">Tocá una estación de la lista o del mapa para ubicarla.</p>
                  {listScroll != null && (
                    <button type="button" className="line-back-to-list" onClick={backToList}>
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M12 5v14m-6-6 6 6 6-6" />
                      </svg>
                      Volver a la lista
                    </button>
                  )}
                </div>
              )}
              <LineInfoCard line={line} stations={lineStations} branches={branchesState.data ?? []} allLines={allLines ?? []} />
              <TravelTimeCard line={line} stations={lineStations} />
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
