import SearchBar from '../components/SearchBar.jsx'
import ModeGrid from '../components/ModeGrid.jsx'
import AlertsPanel from '../components/AlertsPanel.jsx'
import FaresPanel from '../components/FaresPanel.jsx'
import { useApi } from '../hooks/useApi.js'
import '../components/Panels.css'

export default function DashboardPage() {
  const { data: lines, loading: loadingLines, error: linesError } = useApi('/api/v1/lines')
  const { data: alerts, loading: loadingAlerts, error: alertsError } = useApi('/api/v1/alerts')
  const { data: fares, loading: loadingFares, error: faresError } = useApi('/api/v1/fares')

  const loading = loadingLines || loadingAlerts || loadingFares
  const error = linesError || alertsError || faresError
  const ready = lines && alerts && fares

  return (
    <div className="wrap content">
      <SearchBar />
      <div className="section-label">Estado de la red</div>

      {loading && <div className="loading-text">Cargando estado de la red...</div>}
      {error && (
        <div className="error-text">
          No se pudo conectar con la API ({error}). ¿Está corriendo el backend en localhost:8080?
        </div>
      )}

      {ready && (
        <>
          <ModeGrid lines={lines} alerts={alerts} />
          <div className="grid-main">
            <AlertsPanel alerts={alerts} lines={lines} />
            <FaresPanel fares={fares} />
          </div>
        </>
      )}
    </div>
  )
}
