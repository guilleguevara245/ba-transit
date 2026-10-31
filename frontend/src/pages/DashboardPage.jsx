import Skeleton from '../components/Skeleton.jsx'
import Greeting from '../components/Greeting.jsx'
import SearchBar from '../components/SearchBar.jsx'
import DayWeather from '../components/DayWeather.jsx'
import ModeGrid from '../components/ModeGrid.jsx'
import MyLines from '../components/MyLines.jsx'
import { MyAccesses, MyStations } from '../components/MyPlaces.jsx'
import MyBuses from '../components/MyBuses.jsx'
import AccountInvite from '../components/AccountInvite.jsx'
import NotificationsLink from '../components/NotificationsLink.jsx'
import AlertsPanel from '../components/AlertsPanel.jsx'
import FaresPanel from '../components/FaresPanel.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EventsSection from '../components/EventsSection.jsx'
import { useApi } from '../hooks/useApi.js'
import { useNow } from '../hooks/useNow.js'
import { formatRelativeTime } from '../utils/format.js'
import '../components/Panels.css'

// El backend sincroniza las alertas cada 5 minutos; pedirlas cada
// minuto deja el dashboard al dia sin cargar de mas al servidor.
const ALERTS_REFRESH_MS = 60_000

export default function DashboardPage() {
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
    <div className="wrap content">
      {/* En la computadora: saludo, busqueda y favoritos a la izquierda; "Tu dia" a la derecha.
          En el celular, una columna: saludo, busqueda, "Tu dia" y los favoritos. */}
      <div className="home-top">
        <Greeting />
        <SearchBar />
        <DayWeather />
        <div className="home-favorites">
          <AccountInvite />
          {ready && <MyLines lines={lines} alerts={alerts} />}
          {ready && <MyStations lines={lines} alerts={alerts} />}
          <MyAccesses />
          <MyBuses />
          {ready && <NotificationsLink />}
        </div>
      </div>
      <div className="section-label section-label-row">
        <span>Estado de la red</span>
        {alertsState.updatedAt && (
          <span className="updated-at" title={alertsState.updatedAt.toLocaleString('es-AR')}>
            {/* now se usa para que el texto se recalcule cada 30 segundos */}
            Actualizado {formatRelativeTime(alertsState.updatedAt.toISOString(), now)}
          </span>
        )}
      </div>

      {loading && <Skeleton variant="cards" count={6} label="Cargando estado de la red…" />}

      {error && !ready && <ErrorMessage what="el estado de la red" error={error} />}
      {error && ready && (
        <div className="stale-text" role="status">
          No se pudo actualizar; se muestran los últimos datos disponibles.
        </div>
      )}

      {ready && (
        <>
          <ModeGrid lines={lines} alerts={alerts} />
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
