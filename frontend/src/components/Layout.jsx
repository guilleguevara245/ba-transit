import { Outlet } from 'react-router-dom'
import Footer from './Footer.jsx'
import Header from './Header.jsx'
import WeatherAlertBanner from './WeatherAlertBanner.jsx'
import { useAlertsTitle } from '../hooks/useAlertsTitle.js'

export default function Layout() {
  useAlertsTitle()

  return (
    <div className="app">
      <Header />
      <WeatherAlertBanner />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
