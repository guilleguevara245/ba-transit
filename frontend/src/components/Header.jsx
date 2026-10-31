import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import ClockPanel from './ClockPanel.jsx'
import Logo from './Logo.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import AccountButton from './AccountButton.jsx'
import { useClockPrefs } from '../hooks/useClockPrefs.js'
import { useNow } from '../hooks/useNow.js'
import { formatClock, formatClock12, formatDayDate, formatNumericDate, formatShortDate } from '../utils/format.js'
import { holidayOn, localDateKey } from '../utils/holidays.js'
import './Header.css'

// Iconos de trazo (24x24) de cada seccion.
const ICONS = {
  inicio: 'M3 11 12 4l9 7v9h-6v-6H9v6H3z',
  mapa: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14',
  colectivos: 'M5 4h14v12H5zM5 11h14M8 19v-3m8 3v-3M7.5 13.5h.01M16.5 13.5h.01',
  aeropuertos: 'M2 13l9-2 4-8h2l-2 9 6 1 1 2-7 1-3 6h-2l1-7-9-2z',
  comoLlegar: 'M12 21s-6-5.5-6-10.5a6 6 0 0 1 12 0C18 15.5 12 21 12 21zm0-8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  estacionamiento: 'M5.5 11.5 7 7.5h10l1.5 4M4.5 11.5h15v5h-15zM7 16.5v2M17 16.5v2M7.5 14h.01M16.5 14h.01',
  accesos: 'M8 3 5 21m11-18 3 18M12 4v3m0 4v3m0 4v3',
  ecobici: 'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5 9 8h6l3.5 6.5M9 8l3 6.5h-1M14 5h2.5',
}

const TABS = [
  { to: '/', label: 'Inicio', icon: ICONS.inicio, end: true },
  { to: '/mapa', label: 'Mapa', icon: ICONS.mapa },
  { to: '/como-llegar', label: 'Cómo llegar', icon: ICONS.comoLlegar },
  { to: '/colectivos', label: 'Colectivos', icon: ICONS.colectivos },
  { to: '/ecobici', label: 'EcoBici', icon: ICONS.ecobici },
  { to: '/accesos', label: 'Accesos', icon: ICONS.accesos },
  { to: '/estacionamiento', label: 'Estacionamiento', icon: ICONS.estacionamiento },
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

/**
 * La hora y la fecha del header, como las eligio la persona. Al tocarla se
 * abre el panel del reloj (formato y calendario con feriados). Se cierra
 * con Escape, al tocar afuera o al cambiar de pagina.
 */
function Clock({ now }) {
  const { clock, setClock } = useClockPrefs()
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const button = useRef(null)
  const panelId = useId()
  const { pathname } = useLocation()
  const holiday = holidayOn(now)

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (box.current && !box.current.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const time12 = clock.formato === '12' ? formatClock12(now) : null
  let date = null
  if (clock.fecha === 'larga') {
    date = (
      <>
        <span className="clock-date-long">{formatDayDate(now)}</span>
        <span className="clock-date-short">{formatShortDate(now)}</span>
      </>
    )
  } else if (clock.fecha === 'corta') {
    date = <span>{formatNumericDate(now)}</span>
  }

  return (
    <div className="clock-wrap" ref={box}>
      <button
        ref={button}
        type="button"
        className={open ? 'clock-button open' : 'clock-button'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={holiday ? `Feriado: ${holiday}` : 'Reloj y calendario'}
        onClick={() => setOpen((v) => !v)}
      >
        <time className={holiday ? 'clock-time holiday' : 'clock-time'} dateTime={now.toISOString()}>
          <strong>
            {time12 ? (
              <>
                {time12.time}
                <span className="clock-ampm">{time12.suffix}</span>
              </>
            ) : (
              formatClock(now)
            )}
          </strong>
          {(date || holiday) && (
            <small>
              {date}
              {holiday && <span className="clock-holiday">{date ? ' · Feriado' : 'Feriado'}</span>}
            </small>
          )}
        </time>
      </button>
      {open && <ClockPanel id={panelId} now={now} todayKey={localDateKey(now)} clock={clock} onChange={setClock} />}
    </div>
  )
}

export default function Header() {
  const now = useNow(15_000)
  const navRef = useRef(null)
  const { pathname } = useLocation()

  // En pantallas angostas las pestañas se desplazan de costado: se
  // centra la activa para que no quede fuera de la vista.
  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector('.nav-tab.active')
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return
    const offset = active.getBoundingClientRect().left - nav.getBoundingClientRect().left
    nav.scrollLeft += offset - (nav.clientWidth - active.offsetWidth) / 2
  }, [pathname])

  // El degradado de la derecha avisa que hay mas pestañas; al llegar al
  // final se saca, asi la ultima no queda difuminada.
  const [navAtEnd, setNavAtEnd] = useState(false)
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return undefined
    const update = () => setNavAtEnd(nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 2)
    update()
    nav.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      nav.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <header className="header">
      <div className="wrap header-row">
        <NavLink to="/" className="brand" aria-label="BA Transit, ir al inicio">
          <Logo />
        </NavLink>

        <nav ref={navRef} className={navAtEnd ? 'nav-tabs at-end' : 'nav-tabs'} aria-label="Secciones">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabClass}>
              <TabIcon path={tab.icon} />
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="clock">
          <Clock now={now} />
          <ThemeToggle />
          <AccountButton />
        </div>
      </div>
    </header>
  )
}
