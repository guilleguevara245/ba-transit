import { NavLink } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useNow } from '../hooks/useNow.js'
import { formatClock, formatShortDate } from '../utils/format.js'
import './Header.css'

const TABS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/mapa', label: 'Mapa' },
]

function tabClass({ isActive }) {
  return isActive ? 'nav-tab active' : 'nav-tab'
}

export default function Header() {
  const now = useNow(15_000)

  return (
    <header className="header">
      <div className="wrap header-row">
        <NavLink to="/" className="brand" aria-label="BA Transit, ir al inicio">
          <Logo />
        </NavLink>

        <nav className="nav-tabs" aria-label="Secciones">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabClass}>
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="clock">
          <span className="clock-live">
            <span className="clock-live-dot"></span>
            En vivo
          </span>
          <span className="clock-sep" aria-hidden="true"></span>
          <time className="clock-time" dateTime={now.toISOString()}>
            <strong>{formatClock(now)}</strong>
            <small>{formatShortDate(now)}</small>
          </time>
        </div>
      </div>
    </header>
  )
}
