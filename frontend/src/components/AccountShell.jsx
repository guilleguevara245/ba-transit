import { Link, useNavigate } from 'react-router-dom'
import BackButton from './BackButton.jsx'
import EmailText from './EmailText.jsx'
import UserAvatar from './UserAvatar.jsx'
import { useSession } from '../hooks/useSession.js'
import { logout } from '../utils/account.js'
import { ACCOUNT_ICONS } from '../utils/accountIcons.js'
import { fullName } from '../utils/session.js'
import '../pages/AccountPage.css'

/**
 * Secciones de la cuenta: [id, texto, direccion]. Perfil, Seguridad y Tus
 * datos son tarjetas de /cuenta; Mis lugares, Avisos y Dispositivos tienen
 * su propia pagina.
 */
export const ACCOUNT_SECTIONS = [
  ['perfil', 'Perfil', '/cuenta'],
  ['lugares', 'Mis lugares', '/mis-lugares'],
  ['avisos', 'Avisos', '/notificaciones'],
  ['seguridad', 'Seguridad', '/cuenta#seguridad'],
  ['dispositivos', 'Dispositivos', '/dispositivos'],
  ['datos', 'Tus datos', '/cuenta#datos'],
]

function NavIcon({ d }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  )
}

/**
 * El marco de las paginas de la cuenta. Con sesion, en computadora, el
 * menu de la cuenta queda fijo a la izquierda (active: la seccion en la que
 * se esta) y la pagina a la derecha; en el celular, una sola columna. Sin
 * sesion (Mis lugares y Avisos andan sin cuenta), la pagina sola, mas ancha
 * en computadora.
 */
export default function AccountShell({ active, className = '', children }) {
  const session = useSession()
  const navigate = useNavigate()
  const user = session?.user
  const classes = ['wrap', 'content', 'account-page', user ? '' : 'account-guest', className].filter(Boolean)

  function signOut() {
    logout()
    navigate('/')
  }

  return (
    <div className={classes.join(' ')}>
      <BackButton />
      <div className="account-layout">
        {user && (
          <nav className="account-nav" aria-label="Secciones de tu cuenta">
            <div className="account-nav-me">
              <UserAvatar user={user} size={48} />
              <div>
                <strong>{fullName(user) || 'Tu cuenta'}</strong>
                <small>
                  <EmailText email={user.email} />
                </small>
              </div>
            </div>
            {ACCOUNT_SECTIONS.map(([id, label, to]) => (
              <Link key={id} to={to} aria-current={id === active ? 'page' : undefined}>
                <NavIcon d={ACCOUNT_ICONS[id]} />
                {label}
              </Link>
            ))}
            <button type="button" onClick={signOut}>
              <NavIcon d={ACCOUNT_ICONS.salir} />
              Cerrar sesión
            </button>
            <Link
              to="/cuenta#borrar"
              className="account-nav-danger"
              aria-current={active === 'borrar' ? 'page' : undefined}
            >
              <NavIcon d={ACCOUNT_ICONS.borrar} />
              Borrar la cuenta
            </Link>
          </nav>
        )}
        <div className="account-main">{children}</div>
      </div>
    </div>
  )
}
