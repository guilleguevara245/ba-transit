import { Link } from 'react-router-dom'
import Select from './Select.jsx'
import LineBadge from './LineBadge.jsx'
import FavoriteButton from './FavoriteButton.jsx'
import NextTrains from './NextTrains.jsx'
import { useApi } from '../hooks/useApi.js'
import { useFavorites } from '../hooks/useFavorites.js'
import { useFavoriteStations } from '../hooks/useFavoriteStations.js'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { statusFor, worstAlertType } from '../utils/network.js'
import './MyLines.css'
import { linePath } from '../utils/lineSlug.js'
import { hasTrainTimes } from '../utils/nextTrains.js'

/**
 * Seccion "Mis lineas" del inicio: las favoritas con su estado actual.
 * En las que tienen proximos trenes (subte, Premetro, Belgrano Norte y
 * Urquiza) se puede elegir una estacion para verlos.
 */
export default function MyLines({ lines, alerts }) {
  const { favorites } = useFavorites()
  const { stations: chosen, setStation } = useFavoriteStations()
  const { ids: favoriteStations } = useFavoriteList('estaciones')
  const { ids: favoriteAccesses } = useFavoriteList('accesos')
  const { ids: favoriteBuses } = useFavoriteList('colectivos')
  const lineById = new Map(lines.map((line) => [line.id, line]))
  const myLines = favorites.map((id) => lineById.get(id)).filter(Boolean)
  // Lineas con proximos trenes (subte, Premetro, Belgrano Norte, Urquiza): se puede elegir una estacion.
  const withTimes = myLines.some((line) => hasTrainTimes(line.mode, line.code))
  const { data: subteStations } = useApi(withTimes ? '/api/v1/map/stations' : null)
  // Sin lineas pero con estaciones, accesos o colectivos favoritos, la seccion no hace falta.
  if (myLines.length === 0 && (favoriteStations.length > 0 || favoriteAccesses.length > 0 || favoriteBuses.length > 0)) {
    return null
  }

  return (
    <section className="my-lines" aria-label="Mis líneas">
      <div className="section-label">Mis líneas</div>

      {myLines.length === 0 ? (
        <div className="my-lines-empty">
          Tocá la <span className="star">★</span> en cualquier línea, estación, acceso o colectivo para seguir su estado desde
          acá. Se guardan en este navegador.
        </div>
      ) : (
        <div className="my-lines-row">
          {myLines.map((line) => {
            const lineAlerts = alerts.filter((a) => a.transportLineId === line.id)
            const status = statusFor(worstAlertType(lineAlerts))
            const options = (subteStations ?? [])
              .filter((s) => s.lineId === line.id)
              .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
            const station = chosen[line.id]
            return (
              <div key={line.id} className="my-line-card">
                <div className="my-line">
                  <Link to={linePath(line)} className="my-line-link">
                    <LineBadge line={line} size="md" />
                    <span className="my-line-name">{line.name}</span>
                  </Link>
                  <span className={`status-pill ${status.className}`}>
                    <span className="dot"></span>
                    {status.label}
                  </span>
                  <FavoriteButton lineId={line.id} lineName={line.name} compact />
                </div>

                {hasTrainTimes(line.mode, line.code) && options.length > 0 && (
                  <div className="my-line-trains">
                    <Select
                      label={`Estación de la ${line.name} para ver los próximos trenes`}
                      placeholder="Elegí tu estación…"
                      value={station ?? null}
                      onChange={(name) => setStation(line.id, name)}
                      options={[
                        ...(station ? [{ value: '', label: 'Ninguna (ocultar próximos trenes)' }] : []),
                        ...[...new Set(options.map((s) => s.stationName))].map((name) => ({ value: name, label: name, color: line.colorHex })),
                      ]}
                    />
                    {station && <NextTrains mode={line.mode} lineCode={line.code} stationName={station} color={line.colorHex} compact />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
