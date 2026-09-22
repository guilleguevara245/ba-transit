import { NavLink, Outlet } from 'react-router-dom'
import Header from './Header.jsx'
import './NavTabs.css'

function tabClass({ isActive }) {
  return isActive ? 'nav-tab active' : 'nav-tab'
}

export default function Layout() {
  return (
    <div className="app">
      <Header />
      <nav className="nav-tabs">
        <div className="wrap nav-tabs-row">
          <NavLink to="/" end className={tabClass}>
            Dashboard
          </NavLink>
          <NavLink to="/mapa" className={tabClass}>
            Mapa
          </NavLink>
        </div>
      </nav>
      <Outlet />
    </div>
  )
}
