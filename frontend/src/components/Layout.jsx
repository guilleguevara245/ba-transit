import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'
import { useAlertsTitle } from '../hooks/useAlertsTitle.js'

export default function Layout() {
  useAlertsTitle()

  return (
    <div className="app">
      <Header />
      <Outlet />
    </div>
  )
}
