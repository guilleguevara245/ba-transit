import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BAR_TABS, MORE_ICON, MORE_TABS } from './navTabs.js'
import './TabBar.css'

function Icon({ path }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={path} />
    </svg>
  )
}

const itemClass = ({ isActive }) => (isActive ? 'tabbar-item active' : 'tabbar-item')
const sheetClass = ({ isActive }) => (isActive ? 'tabbar-sheet-item active' : 'tabbar-sheet-item')

/**
 * Barra de secciones fija abajo, como en las apps (solo en el celular;
 * en pantallas mas anchas las secciones van en el header). Inicio, Mapa,
 * Como llegar y Colectivos; "Más" abre un panel con el resto. El panel se
 * cierra con Escape, al tocar afuera o al elegir una seccion.
 */
export default function TabBar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const sheet = useRef(null)
  const button = useRef(null)
  const sheetId = useId()
  const moreActive = MORE_TABS.some((tab) => pathname === tab.to || pathname.startsWith(`${tab.to}/`))

  // Al cambiar de pagina, el panel se cierra.
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    // Al abrir, el foco va a la primera seccion (para usarlo con teclado o lector de pantalla).
    sheet.current?.querySelector('a')?.focus({ preventScroll: true })
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {open && <div className="tabbar-dim" aria-hidden="true" onClick={() => setOpen(false)} />}
      {open && (
        <div className="tabbar-sheet" id={sheetId} ref={sheet} role="dialog" aria-label="Más secciones">
          <p className="tabbar-sheet-title">Más secciones</p>
          <div className="tabbar-sheet-grid">
            {MORE_TABS.map((tab) => (
              <NavLink key={tab.to} to={tab.to} className={sheetClass}>
                <Icon path={tab.icon} />
                {tab.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
      <nav className={open ? 'tabbar sheet-open' : 'tabbar'} aria-label="Secciones">
        {BAR_TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={itemClass}>
            <span className="tabbar-icon">
              <Icon path={tab.icon} />
            </span>
            {tab.label}
          </NavLink>
        ))}
        <button
          ref={button}
          type="button"
          className={open || moreActive ? 'tabbar-item tabbar-more active' : 'tabbar-item tabbar-more'}
          aria-expanded={open}
          aria-controls={open ? sheetId : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="tabbar-icon">
            <Icon path={MORE_ICON} />
          </span>
          Más
        </button>
      </nav>
    </>
  )
}
