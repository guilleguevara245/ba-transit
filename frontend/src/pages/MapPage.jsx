import Skeleton from '../components/Skeleton.jsx'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage.jsx'
import NetworkMap from '../components/NetworkMap.jsx'
import { useApi } from '../hooks/useApi.js'
import { MODE_LABELS_PLURAL } from '../constants.js'
import { buildLegend } from '../utils/map.js'
import './MapPage.css'

const MODE_ORDER = ['SUBTE', 'PREMETRO', 'TREN']

export default function MapPage() {
  const { data: stations, loading, error } = useApi('/api/v1/map/stations')
  // Las alertas solo enriquecen los popups; si fallan, el mapa se muestra igual.
  const { data: alerts } = useApi('/api/v1/alerts', { refreshMs: 60_000 })
  const [searchParams] = useSearchParams()
  const [modeFilter, setModeFilter] = useState('TODOS')
  const [accessibleOnly, setAccessibleOnly] = useState(false)
  // Linea elegida en la referencia: el mapa muestra solo esa (null = todas).
  const [lineFilter, setLineFilter] = useState(null)

  const focusId = Number(searchParams.get('estacion')) || null

  const modes = useMemo(
    () => MODE_ORDER.filter((mode) => stations?.some((s) => s.lineMode === mode)),
    [stations],
  )
  const byMode = useMemo(
    () =>
      (stations ?? []).filter(
        (s) => (modeFilter === 'TODOS' || s.lineMode === modeFilter) && (lineFilter == null || s.lineId === lineFilter),
      ),
    [stations, modeFilter, lineFilter],
  )
  const visible = useMemo(() => (accessibleOnly ? byMode.filter((s) => s.accessible) : byMode), [byMode, accessibleOnly])
  const focusMissing = focusId && stations && !stations.some((s) => s.stationId === focusId)

  return (
    <div className="wrap content">
      <div className="map-toolbar">
        <h1 className="section-label">Mapa de la red</h1>
        {modes.length > 1 && (
          <div className="map-filters" role="group" aria-label="Filtrar por modo">
            {['TODOS', ...modes].map((mode) => (
              <button
                key={mode}
                type="button"
                className={mode === modeFilter ? 'map-filter active' : 'map-filter'}
                aria-pressed={mode === modeFilter}
                onClick={() => {
                  setModeFilter(mode)
                  setLineFilter(null)
                }}
              >
                {mode === 'TODOS' ? 'Todos' : MODE_LABELS_PLURAL[mode]}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={accessibleOnly ? 'map-filter active' : 'map-filter'}
          aria-pressed={accessibleOnly}
          onClick={() => setAccessibleOnly((value) => !value)}
        >
          Solo accesibles
        </button>
      </div>
      {accessibleOnly && (
        <div className="map-note">Estaciones de subte que Emova informa como accesibles.</div>
      )}

      {loading && <Skeleton variant="map" label="Cargando estaciones…" />}
      {error && <ErrorMessage what="el mapa" error={error} />}
      {focusMissing && <div className="stale-text">Esa estación todavía no tiene ubicación cargada en el mapa.</div>}

      {stations && (
        <>
          <NetworkMap
            className="map-container"
            stations={visible}
            routeStations={byMode}
            allStations={stations}
            alerts={alerts ?? []}
            focusId={focusId}
          />

          <div className="map-legend" role="group" aria-label="Filtrar el mapa por línea">
            {modes
              .filter((mode) => modeFilter === 'TODOS' || mode === modeFilter)
              .map((mode) => (
                <div className="map-legend-group" key={mode}>
                  <span className="map-legend-title">{MODE_LABELS_PLURAL[mode]}</span>
                  {buildLegend(stations.filter((s) => s.lineMode === mode)).map((line) => (
                    <button
                      type="button"
                      className={line.id === lineFilter ? 'map-legend-item active' : 'map-legend-item'}
                      aria-pressed={line.id === lineFilter}
                      key={line.id}
                      onClick={() => setLineFilter(line.id === lineFilter ? null : line.id)}
                    >
                      <span className="map-legend-dot" style={{ background: line.color }}></span>
                      {line.name}
                    </button>
                  ))}
                </div>
              ))}
            {lineFilter != null && (
              <button type="button" className="map-legend-all" onClick={() => setLineFilter(null)}>
                Ver todas las líneas
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
