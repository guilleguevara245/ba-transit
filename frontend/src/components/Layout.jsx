import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Skeleton from './Skeleton.jsx'
import Footer from './Footer.jsx'
import Header from './Header.jsx'
import TabBar from './TabBar.jsx'
import WeatherAlertBanner from './WeatherAlertBanner.jsx'
import AccountSync from './AccountSync.jsx'
import { useAlertsTitle } from '../hooks/useAlertsTitle.js'
import { useScrollToTop } from '../hooks/useScrollToTop.js'

export default function Layout() {
  useAlertsTitle()
  useScrollToTop()
  const { pathname } = useLocation()

  return (
    <div className="app">
      <AccountSync />
      <Header />
      <WeatherAlertBanner />
      <main className="app-main">
        {/* Con key, cada pagina nueva entra con un fundido corto (ver .page-enter). */}
        <div key={pathname} className="page-enter">
          <Suspense
            fallback={
              <div className="wrap content">
                <Skeleton variant="block" label="Cargando…" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
      <Footer />
      <TabBar />
    </div>
  )
}
