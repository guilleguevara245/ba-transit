import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import MapPage from './pages/MapPage.jsx'
import LinePage from './pages/LinePage.jsx'
import ModePage from './pages/ModePage.jsx'
import AirportsPage from './pages/AirportsPage.jsx'
import ColectivosPage from './pages/ColectivosPage.jsx'
import AccessesPage from './pages/AccessesPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/lineas/:lineId" element={<LinePage />} />
          <Route path="/modos/:slug" element={<ModePage />} />
          <Route path="/aeropuertos" element={<AirportsPage />} />
          <Route path="/colectivos" element={<ColectivosPage />} />
          <Route path="/accesos" element={<AccessesPage />} />
          <Route path="/acerca" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
