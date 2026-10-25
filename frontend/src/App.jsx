import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import MapPage from './pages/MapPage.jsx'
import LinePage from './pages/LinePage.jsx'
import ModePage from './pages/ModePage.jsx'
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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
