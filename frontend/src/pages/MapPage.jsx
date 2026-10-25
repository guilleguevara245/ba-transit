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

  const focusId = Number(searchParams.get('estacion')) || null

  const modes = useMemo(
    () => MODE_ORDER.filter((mode) => stations?.some((s) => s.lineMode === mode)),
    [stations],
  )
  const visible = useMemo(
    () => (stations ?? []).filter((s) => modeFilter === 'TODOS' || s.lineMode === modeFilter),
    [stations, modeFilter],
  )
  const focusMissing = focusId && stations && !stations.some((s) => s.stationId === focusId)

  return (
    <div className="wrap content">
      <div className="map-toolbar">
        <div className="section-label">Mapa de la red</div>
        {modes.length > 1 && (
          <div className="map-filters" role="group" aria-label="Filtrar por modo">
            {['TODOS', ...modes].map((mode) => (
              <button
                key={mode}
                type="button"
                className={mode === modeFilter ? 'map-filter active' : 'map-filter'}
                aria-pressed={mode === modeFilter}
                onClick={() => setModeFilter(mode)}
              >
                {mode === 'TODOS' ? 'Todos' : MODE_LABELS_PLURAL[mode]}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="loading-text">Cargando estaciones...</div>}
      {error && <ErrorMessage what="el mapa" error={error} />}
      {focusMissing && <div className="stale-text">Esa estación todavía no tiene ubicación cargada en el mapa.</div>}

      {stations && (
        <>
          <NetworkMap
            className="map-container"
            stations={visible}
            allStations={stations}
            alerts={alerts ?? []}
            focusId={focusId}
          />

          <div className="map-legend">
            {modes
              .filter((mode) => modeFilter === 'TODOS' || mode === modeFilter)
              .map((mode) => (
                <div className="map-legend-group" key={mode}>
                  <span className="map-legend-title">{MODE_LABELS_PLURAL[mode]}</span>
                  {buildLegend(stations.filter((s) => s.lineMode === mode)).map((line) => (
                    <span className="map-legend-item" key={line.name}>
                      <span className="map-legend-dot" style={{ background: line.color }}></span>
                      {line.name}
                    </span>
                  ))}
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
