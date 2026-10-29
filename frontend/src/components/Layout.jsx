import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Skeleton from './Skeleton.jsx'
import Footer from './Footer.jsx'
import Header from './Header.jsx'
import WeatherAlertBanner from './WeatherAlertBanner.jsx'
import AccountSync from './AccountSync.jsx'
import { useAlertsTitle } from '../hooks/useAlertsTitle.js'

export default function Layout() {
  useAlertsTitle()

  return (
    <div className="app">
      <AccountSync />
      <Header />
      <WeatherAlertBanner />
      <main className="app-main">
        <Suspense
          fallback={
            <div className="wrap content">
              <Skeleton variant="block" label="Cargando…" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
