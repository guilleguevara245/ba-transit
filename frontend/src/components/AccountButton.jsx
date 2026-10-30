import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession.js'
import { logout } from '../utils/account.js'
import { fullName } from '../utils/session.js'
import { ACCOUNT_ICONS } from '../utils/accountIcons.js'
import EmailText from './EmailText.jsx'
import UserAvatar from './UserAvatar.jsx'

const USER_ICON = 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0'

/** Opciones del menu de la cuenta: [texto, direccion, icono]. */
const ITEMS = [
  ['Tu cuenta', '/cuenta', 'perfil'],
  ['Mis lugares', '/mis-lugares', 'lugares'],
  ['Avisos', '/notificaciones', 'avisos'],
  ['Dispositivos', '/cuenta#dispositivos', 'dispositivos'],
]

function MenuIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ACCOUNT_ICONS[name]} />
    </svg>
  )
}

/**
 * Boton de la cuenta en el header. Sin sesion, lleva a "Ingresar"; con
 * sesion, la imagen de la cuenta abre un menu con el nombre, el mail y los
 * accesos (como en la mayoria de los sitios). Se cierra con Escape, al tocar
 * afuera o al elegir una opcion.
 */
export default function AccountButton() {
  const session = useSession()
  const user = session?.user
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const button = useRef(null)
  const menuId = useId()

  // Al cambiar de pagina, el menu se cierra.
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
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      // Flechas: de una opcion a la otra (y de la ultima vuelve a la primera).
      const items = [...(box.current?.querySelectorAll('[role="menuitem"]') ?? [])]
      if (items.length === 0) return
      event.preventDefault()
      const at = items.indexOf(document.activeElement)
      const next = event.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length
      items[at < 0 ? 0 : next].focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    // Al abrir, el foco va a la primera opcion (para usarlo con teclado).
    box.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) {
    return (
      <Link to="/ingresar" className="account-button" aria-label="Ingresar o crear una cuenta" title="Ingresar">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d={USER_ICON} />
        </svg>
      </Link>
    )
  }

  function signOut() {
    setOpen(false)
    logout()
    navigate('/')
  }

  return (
    <div className="account-menu-wrap" ref={box}>
      <button
        ref={button}
        type="button"
        className={`account-button signed-in${open ? ' open' : ''}`}
        aria-label={`Tu cuenta (${user.email})`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <UserAvatar user={user} size={28} />
      </button>
      {open && (
        <div className="account-menu" id={menuId} role="menu" aria-label="Tu cuenta">
          <div className="account-menu-me">
            <UserAvatar user={user} size={44} />
            <div>
              <strong>{fullName(user) || 'Tu cuenta'}</strong>
              <small>
                <EmailText email={user.email} />
              </small>
            </div>
          </div>
          {ITEMS.map(([label, to, icon]) => (
            <Link key={to} to={to} role="menuitem" className="account-menu-item" onClick={() => setOpen(false)}>
              <MenuIcon name={icon} />
              {label}
            </Link>
          ))}
          <button type="button" role="menuitem" className="account-menu-item account-menu-out" onClick={signOut}>
            <MenuIcon name="salir" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
