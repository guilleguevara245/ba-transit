import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DataSection, DevicesSection, NameEditor, PasswordSection } from '../components/AccountSettings.jsx'
import BackButton from '../components/BackButton.jsx'
import Chevrons from '../components/Chevrons.jsx'
import ImagePicker from '../components/ImagePicker.jsx'
import PlaceIcon from '../components/PlaceIcon.jsx'
import UserAvatar from '../components/UserAvatar.jsx'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { useSavedPlaces } from '../hooks/useSavedPlaces.js'
import { useSession } from '../hooks/useSession.js'
import { deleteAccount, logout } from '../utils/account.js'
import { formatLongDate } from '../utils/format.js'
import './AccountPage.css'

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

/** Iconos del menu de la cuenta (trazos de 24x24, como los del sitio). */
const NAV = [
  ['perfil', 'Perfil', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6'],
  ['lugares', 'Mis lugares', 'M12 21s-6-5.6-6-10a6 6 0 1 1 12 0c0 4.4-6 10-6 10zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  ['avisos', 'Avisos', 'M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0'],
  ['seguridad', 'Seguridad', 'M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3'],
  ['dispositivos', 'Dispositivos', 'M3 5h13v10H3zM17 9h4v10h-4zM7 19h6'],
  ['datos', 'Tus datos', 'M12 4v11M7 10l5 5 5-5M5 20h14'],
]

function NavIcon({ d }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  )
}

/**
 * Tu cuenta. En computadora, un menu fijo a la izquierda y cada seccion en
 * su tarjeta; en el celular, todo en una columna.
 */
export default function AccountPage() {
  const navigate = useNavigate()
  const session = useSession()
  const lines = useFavoriteList('lineas').ids.length
  const stations = useFavoriteList('estaciones').ids.length
  const accesses = useFavoriteList('accesos').ids.length
  const buses = useFavoriteList('colectivos').ids.length
  const { places } = useSavedPlaces()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!session) navigate('/ingresar', { replace: true })
  }, [session, navigate])
  if (!session) return null
  const { user } = session

  const methods = [user.hasGoogle && 'Google', user.hasPassword && 'mail y contraseña'].filter(Boolean).join(' y ')

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await deleteAccount()
      navigate('/', { replace: true })
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  function signOut() {
    logout()
    navigate('/')
  }

  return (
    <div className="wrap content account-page">
      <BackButton />
      <div className="account-layout">
        <nav className="account-nav" aria-label="Secciones de tu cuenta">
          <div className="account-nav-me">
            <UserAvatar user={user} size={48} />
            <div>
              <strong>{user.name || 'Tu cuenta'}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          {NAV.map(([id, label, icon]) => (
            <a key={id} href={`#${id}`}>
              <NavIcon d={icon} />
              {label}
            </a>
          ))}
          <button type="button" onClick={signOut}>
            <NavIcon d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
            Cerrar sesión
          </button>
          <a href="#borrar" className="account-nav-danger">
            <NavIcon d="M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z" />
            Borrar la cuenta
          </a>
        </nav>

        <div className="account-main">
          <section className="account-card" id="perfil" aria-labelledby="account-title">
            {/* En el celular, la cabecera con la imagen y el nombre (en computadora ya esta en el menu). */}
            <div className="account-hero">
              <UserAvatar user={user} size={72} />
              <div className="account-hero-text">
                <h1 className="auth-title" id="account-title">
                  {user.name || 'Tu cuenta'}
                </h1>
                <span>{user.email}</span>
              </div>
            </div>
            <h2 className="account-card-title account-desktop-only">Perfil</h2>
            <p className="account-help account-desktop-only">Cómo te ves en BA Transit.</p>

            <dl className="account-rows">
              <dt>Nombre</dt>
              <dd>
                <span>{user.name || 'Sin nombre'}</span>
                <NameEditor key={user.name ?? ''} user={user} short />
              </dd>
              <dt>Mail</dt>
              <dd>{user.email}</dd>
              <dt>Entrás con</dt>
              <dd>{methods}</dd>
              {user.createdAt && (
                <>
                  <dt>Desde</dt>
                  <dd>{formatLongDate(user.createdAt.slice(0, 10))}</dd>
                </>
              )}
              <dt>Guardados</dt>
              <dd>
                {plural(lines, 'línea', 'líneas')}, {plural(stations, 'estación', 'estaciones')},{' '}
                {plural(accesses, 'acceso', 'accesos')} y {plural(buses, 'colectivo', 'colectivos')}. Se sincronizan
                solos en todos tus dispositivos, igual que tus lugares, el tema y tus preferencias de avisos.
              </dd>
              <dt className="account-rows-wide-label">Tu imagen</dt>
              <dd className="account-rows-wide">
                <ImagePicker user={user} />
              </dd>
            </dl>
          </section>

          <section className="account-card" id="lugares">
            <h2 className="account-card-title">Mis lugares</h2>
            {places.length > 0 ? (
              <ul className="account-places">
                {places.map((p, i) => (
                  <li key={i}>
                    <PlaceIcon tipo={p.tipo} size="sm" />
                    {p.nombre}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="account-help">Guardá Casa y Trabajo para armar el viaje con un toque.</p>
            )}
            <Link className="notif-account-link chevrons-host" to="/mis-lugares">
              {places.length > 0 ? 'Editar mis lugares' : 'Agregar mis lugares'} <Chevrons />
            </Link>
          </section>

          <section className="account-card" id="avisos">
            <h2 className="account-card-title">Avisos</h2>
            <p className="account-help">
              Qué avisarte, el horario sin avisos, el resumen de la mañana y el último subte. Los avisos son de cada
              dispositivo.
            </p>
            <Link className="notif-account-link chevrons-host" to="/notificaciones">
              Avisos de tus favoritos en este dispositivo <Chevrons />
            </Link>
          </section>

          <section className="account-card" id="seguridad">
            <h2 className="account-card-title">Seguridad</h2>
            <PasswordSection user={user} />
          </section>

          <section className="account-card" id="dispositivos">
            <h2 className="account-card-title">Dispositivos</h2>
            <DevicesSection />
          </section>

          <section className="account-card" id="datos">
            <h2 className="account-card-title">Tus datos</h2>
            <DataSection heading={false} />
            <p className="auth-note">
              Qué datos se guardan y para qué: <Link to="/privacidad">política de privacidad</Link>.
            </p>
          </section>

          <div className="account-actions account-mobile-only">
            <button type="button" className="auth-submit" onClick={signOut}>
              Cerrar sesión
            </button>
          </div>

          <section className="account-card account-danger" id="borrar">
            <h2 className="account-card-title">Borrar la cuenta</h2>
            <p>
              Se borran tu cuenta y los favoritos guardados en ella. En este navegador los favoritos quedan hasta que los
              quites. No se puede deshacer.
            </p>
            {error && (
              <p className="auth-error auth-error-box" role="alert">
                {error}
              </p>
            )}
            {confirming ? (
              <div className="account-confirm">
                <button type="button" className="account-delete" onClick={remove} disabled={busy}>
                  {busy ? 'Borrando…' : 'Sí, borrar mi cuenta'}
                </button>
                <button type="button" className="auth-skip" onClick={() => setConfirming(false)} disabled={busy}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" className="account-delete outline" onClick={() => setConfirming(true)}>
                Borrar mi cuenta
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
