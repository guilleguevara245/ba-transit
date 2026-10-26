import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { useNow } from '../hooks/useNow.js'
import { formatClock, formatDayDate, formatShortDate } from '../utils/format.js'
import { holidayOn } from '../utils/holidays.js'
import './Header.css'

// Iconos de trazo (24x24) de cada seccion.
const ICONS = {
  inicio: 'M3 11 12 4l9 7v9h-6v-6H9v6H3z',
  mapa: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14',
  colectivos: 'M5 4h14v12H5zM5 11h14M8 19v-3m8 3v-3M7.5 13.5h.01M16.5 13.5h.01',
  aeropuertos: 'M2 13l9-2 4-8h2l-2 9 6 1 1 2-7 1-3 6h-2l1-7-9-2z',
  accesos: 'M8 3 5 21m11-18 3 18M12 4v3m0 4v3m0 4v3',
  comoLlegar: 'M12 21s-6-5.5-6-10.5a6 6 0 0 1 12 0C18 15.5 12 21 12 21zm0-8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  ecobici: 'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5 9 8h6l3.5 6.5M9 8l3 6.5h-1M14 5h2.5',
}

const TABS = [
  { to: '/', label: 'Inicio', icon: ICONS.inicio, end: true },
  { to: '/mapa', label: 'Mapa', icon: ICONS.mapa },
  { to: '/como-llegar', label: 'Cómo llegar', icon: ICONS.comoLlegar },
  { to: '/colectivos', label: 'Colectivos', icon: ICONS.colectivos },
  { to: '/accesos', label: 'Accesos', icon: ICONS.accesos },
  { to: '/ecobici', label: 'EcoBici', icon: ICONS.ecobici },
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
  const navRef = useRef(null)
  const { pathname } = useLocation()
  const holiday = holidayOn(now)

  // En pantallas angostas las pestañas se desplazan de costado: se
  // centra la activa para que no quede fuera de la vista.
  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector('.nav-tab.active')
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return
    const offset = active.getBoundingClientRect().left - nav.getBoundingClientRect().left
    nav.scrollLeft += offset - (nav.clientWidth - active.offsetWidth) / 2
  }, [pathname])

  return (
    <header className="header">
      <div className="wrap header-row">
        <NavLink to="/" className="brand" aria-label="BA Transit, ir al inicio">
          <Logo />
        </NavLink>

        <nav ref={navRef} className="nav-tabs" aria-label="Secciones">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabClass}>
              <TabIcon path={tab.icon} />
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="clock">
          <time
            className={holiday ? 'clock-time holiday' : 'clock-time'}
            dateTime={now.toISOString()}
            title={holiday ? `Feriado: ${holiday}` : undefined}
          >
            <strong>{formatClock(now)}</strong>
            <small>
              <span className="clock-date-long">{formatDayDate(now)}</span>
              <span className="clock-date-short">{formatShortDate(now)}</span>
              {holiday && <span className="clock-holiday"> · Feriado</span>}
            </small>
          </time>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
