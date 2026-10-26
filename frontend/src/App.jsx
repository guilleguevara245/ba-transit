import { lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import './App.css'

// El inicio se carga con el sitio; el resto de las paginas (y sus mapas)
// se descargan recien cuando se abren, asi la primera visita es mas liviana.
const MapPage = lazy(() => import('./pages/MapPage.jsx'))
const LinePage = lazy(() => import('./pages/LinePage.jsx'))
const ModePage = lazy(() => import('./pages/ModePage.jsx'))
const AirportsPage = lazy(() => import('./pages/AirportsPage.jsx'))
const ColectivosPage = lazy(() => import('./pages/ColectivosPage.jsx'))
const AccessesPage = lazy(() => import('./pages/AccessesPage.jsx'))
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'))
const EcobiciPage = lazy(() => import('./pages/EcobiciPage.jsx'))
const ParkingPage = lazy(() => import('./pages/ParkingPage.jsx'))
const StatusPage = lazy(() => import('./pages/StatusPage.jsx'))
const TrainNoticesPage = lazy(() => import('./pages/TrainNoticesPage.jsx'))
const StationPage = lazy(() => import('./pages/StationPage.jsx'))
const SubePage = lazy(() => import('./pages/SubePage.jsx'))
const TripPlannerPage = lazy(() => import('./pages/TripPlannerPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/lineas/:lineId" element={<LinePage />} />
          <Route path="/estaciones/:stationId" element={<StationPage />} />
          <Route path="/modos/:slug" element={<ModePage />} />
          <Route path="/aeropuertos" element={<AirportsPage />} />
          <Route path="/colectivos" element={<ColectivosPage />} />
          <Route path="/accesos" element={<AccessesPage />} />
          <Route path="/ecobici" element={<EcobiciPage />} />
          <Route path="/estacionamiento" element={<ParkingPage />} />
          <Route path="/sube" element={<SubePage />} />
          <Route path="/como-llegar" element={<TripPlannerPage />} />
          <Route path="/trenes/avisos" element={<TrainNoticesPage />} />
          <Route path="/acerca" element={<AboutPage />} />
          <Route path="/estado" element={<StatusPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
