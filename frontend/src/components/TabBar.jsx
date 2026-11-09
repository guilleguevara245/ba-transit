import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
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
  const nav = useRef(null)
  // La pastilla amarilla: donde esta la seccion activa (x, y dentro de la barra) y si ya se puede deslizar.
  const [pill, setPill] = useState(null)
  const moreActive = MORE_TABS.some((tab) => pathname === tab.to || pathname.startsWith(`${tab.to}/`))

  // Al cambiar de pagina, el panel se cierra.
  useEffect(() => setOpen(false), [pathname])

  // Ubica la pastilla sobre el icono activo; desde la segunda vez, se desliza hasta ahi.
  useLayoutEffect(() => {
    const bar = nav.current
    if (!bar) return undefined
    const place = () => {
      const icon = bar.querySelector(open ? '.tabbar-more .tabbar-icon' : '.tabbar-item.active .tabbar-icon')
      // Sin barra a la vista (pantalla ancha) o sin seccion activa en la barra: sin pastilla.
      // (offsetParent no sirve: con position fixed siempre es null.)
      if (!icon || window.getComputedStyle(bar).display === 'none') {
        setPill((p) => (p ? { ...p, hidden: true } : null))
        return
      }
      const box = bar.getBoundingClientRect()
      const at = icon.getBoundingClientRect()
      setPill((p) => ({ x: at.left - box.left, y: at.top - box.top, slide: Boolean(p && !p.hidden) }))
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [pathname, open])

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
      <nav ref={nav} className={open ? 'tabbar sheet-open' : 'tabbar'} aria-label="Secciones">
        {pill && (
          <span
            className={`tabbar-pill${pill.slide ? ' slide' : ''}${pill.hidden ? ' hidden' : ''}`}
            style={{ transform: `translate(${pill.x}px, ${pill.y}px)` }}
            aria-hidden="true"
          />
        )}
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
