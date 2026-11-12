import Skeleton from '../components/Skeleton.jsx'
import Greeting from '../components/Greeting.jsx'
import SearchBar from '../components/SearchBar.jsx'
import DayWeather from '../components/DayWeather.jsx'
import ModeGrid from '../components/ModeGrid.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import FavoritesPanel from '../components/FavoritesPanel.jsx'
import AccountInvite from '../components/AccountInvite.jsx'
import AlertsPanel from '../components/AlertsPanel.jsx'
import FaresPanel from '../components/FaresPanel.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EventsSection from '../components/EventsSection.jsx'
import { useEffect, useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { useNow } from '../hooks/useNow.js'
import { formatRelativeTime } from '../utils/format.js'
import '../components/Panels.css'
import './DashboardPage.css'

// El backend sincroniza las alertas cada 5 minutos; pedirlas cada
// minuto deja el dashboard al dia sin cargar de mas al servidor.
const ALERTS_REFRESH_MS = 60_000

// Las tarjetas entran de a una solo la primera vez que se abre el inicio en la visita.
let entered = false

export default function DashboardPage() {
  const [enter] = useState(() => !entered)
  useEffect(() => {
    entered = true
  }, [])
  const linesState = useApi('/api/v1/lines')
  const alertsState = useApi('/api/v1/alerts', { refreshMs: ALERTS_REFRESH_MS })
  const faresState = useApi('/api/v1/fares')
  const now = useNow()

  const lines = linesState.data
  const alerts = alertsState.data
  const fares = faresState.data

  const ready = lines && alerts && fares
  const loading = !ready && (linesState.loading || alertsState.loading || faresState.loading)
  const error = linesState.error || alertsState.error || faresState.error

  return (
    <div className={enter ? 'wrap content home-enter' : 'wrap content'}>
      {/* En la computadora: saludo, busqueda y favoritos a la izquierda; "Tu dia" a la derecha.
          En el celular, una columna: saludo, busqueda, "Tu dia" y los favoritos. */}
      <div className="home-top">
        <Greeting />
        <SearchBar />
        <DayWeather />
        <div className="home-favorites">
          <AccountInvite />
          <FavoritesPanel lines={lines} alerts={alerts} />
        </div>
      </div>
      {/* Un panel con el titulo adentro, como "Tus favoritos" y "Alertas destacadas". */}
      <section className="network-panel" aria-labelledby="network-title">
        <header className="network-head">
          <h2 id="network-title" className="panel-heading">
            <ModeIcon mode="RED" size="title" />
            Estado de la red
          </h2>
          {alertsState.updatedAt && (
            <span className="updated-at" title={alertsState.updatedAt.toLocaleString('es-AR')}>
              {/* now se usa para que el texto se recalcule cada 30 segundos */}
              Actualizado {formatRelativeTime(alertsState.updatedAt.toISOString(), now)}
            </span>
          )}
        </header>
        {error && ready && (
          <div className="stale-text network-stale" role="status">
            No se pudo actualizar; se muestran los últimos datos disponibles.
          </div>
        )}
        {ready ? (
          <ModeGrid lines={lines} alerts={alerts} />
        ) : (
          <div className="network-wait">
            {loading && <Skeleton variant="cards" count={4} label="Cargando estado de la red…" />}
            {error && <ErrorMessage what="el estado de la red" error={error} />}
          </div>
        )}
      </section>

      {ready && (
        <>
          <div className="grid-main">
            <AlertsPanel alerts={alerts} lines={lines} />
            <div className="panel-stack">
              <FaresPanel fares={fares} />
              <EventsSection />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
