import { NavLink } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useNow } from '../hooks/useNow.js'
import { formatClock, formatShortDate } from '../utils/format.js'
import './Header.css'

// Iconos de trazo (24x24) de cada seccion.
const ICONS = {
  inicio: 'M3 11 12 4l9 7v9h-6v-6H9v6H3z',
  mapa: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14',
  colectivos: 'M5 4h14v12H5zM5 11h14M8 19v-3m8 3v-3M7.5 13.5h.01M16.5 13.5h.01',
  aeropuertos: 'M2 13l9-2 4-8h2l-2 9 6 1 1 2-7 1-3 6h-2l1-7-9-2z',
}

const TABS = [
  { to: '/', label: 'Inicio', icon: ICONS.inicio, end: true },
  { to: '/mapa', label: 'Mapa', icon: ICONS.mapa },
  { to: '/colectivos', label: 'Colectivos', icon: ICONS.colectivos },
  { to: '/aeropuertos', label: 'Aeropuertos', icon: ICONS.aeropuertos },
]

function TabIcon({ path }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={path} />
    </svg>
  )
}

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
              <TabIcon path={tab.icon} />
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
