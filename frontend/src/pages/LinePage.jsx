import SpecialServices from '../components/SpecialServices.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import AlertsPanel from '../components/AlertsPanel.jsx'
import BackButton from '../components/BackButton.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import LineBadge from '../components/LineBadge.jsx'
import LineInfoCard from '../components/LineInfoCard.jsx'
import NetworkMap from '../components/NetworkMap.jsx'
import { useApi } from '../hooks/useApi.js'
import { MODE_LABELS } from '../constants.js'
import '../components/Panels.css'
import './LinePage.css'

function BranchStations({ branch, line, selected, onSelect, locatedIds }) {
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
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default function LinePage() {
  const { lineId } = useParams()
  const [searchParams] = useSearchParams()
  const urlStationId = Number(searchParams.get('estacion')) || null
  const [selected, setSelected] = useState({ id: urlStationId, fromUrl: true })

  useEffect(() => {
    setSelected({ id: urlStationId, fromUrl: true })
  }, [urlStationId, lineId])

  const lineState = useApi(`/api/v1/lines/${lineId}`)
  const branchesState = useApi(`/api/v1/lines/${lineId}/branches`)
  const alertsState = useApi(`/api/v1/lines/${lineId}/alerts`, { refreshMs: 60_000 })

  const line = lineState.data
  // Estaciones del mismo modo con coordenadas: las de esta linea van al
  // minimapa y el resto sirve para mostrar combinaciones en el popup.
  const modeStationsState = useApi(line ? `/api/v1/map/stations?mode=${line.mode}` : null)
  const modeStations = modeStationsState.data ?? []
  const lineStations = useMemo(
    () => modeStations.filter((s) => String(s.lineId) === String(lineId)),
    [modeStations, lineId],
  )
  const locatedIds = useMemo(() => new Set(lineStations.map((s) => s.stationId)), [lineStations])
  const hasMap = lineStations.length > 0
  // Para mostrar los badges de las lineas con las que combina.
  // Subte y premetro combinan entre si: hacen falta todas las lineas para los badges.
  const isMetro = line?.mode === 'SUBTE' || line?.mode === 'PREMETRO'
  const { data: allLines } = useApi(isMetro ? '/api/v1/lines' : null)

  return (
    <div className="wrap content">
      <BackButton />

      {lineState.loading && <Skeleton variant="block" label="Cargando línea…" />}
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
                  onSelect={(id) => setSelected({ id, fromUrl: false })}
                  locatedIds={locatedIds}
                />
              ))}
            </div>

            {/* Columna derecha: siempre el mismo formato, con el minimapa
                (si hay coordenadas) y debajo la informacion de la linea. */}
            <aside className="line-side">
              {hasMap && (
                <>
                  <NetworkMap
                    className="line-minimap"
                    stations={lineStations}
                    allStations={modeStations}
                    alerts={alertsState.data ?? []}
                    focusId={selected.id}
                    onSelect={(id) => setSelected({ id, fromUrl: false })}
                  />
                  <p className="line-minimap-hint">Tocá una estación de la lista o del mapa para ubicarla.</p>
                </>
              )}
              <LineInfoCard line={line} stations={lineStations} allLines={allLines ?? []} />
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
