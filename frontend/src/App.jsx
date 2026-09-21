import Header from './components/Header.jsx'
import ModeGrid from './components/ModeGrid.jsx'
import { useApi } from './hooks/useApi.js'
import './App.css'

export default function App() {
  const { data: lines, loading: loadingLines, error: linesError } = useApi('/api/v1/lines')
  const { data: alerts, loading: loadingAlerts, error: alertsError } = useApi('/api/v1/alerts')

  const loading = loadingLines || loadingAlerts
  const error = linesError || alertsError

  return (
    <div className="app">
      <Header />
      <div className="wrap content">
        <div className="section-label">Estado de la red</div>

        {loading && <div className="loading-text">Cargando estado de la red...</div>}
        {error && (
          <div className="error-text">
            No se pudo conectar con la API ({error}). ¿Está corriendo el backend en localhost:8080?
          </div>
        )}
        {lines && alerts && <ModeGrid lines={lines} alerts={alerts} />}
      </div>
    </div>
  )
}
