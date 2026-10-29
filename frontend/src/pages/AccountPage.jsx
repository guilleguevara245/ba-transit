import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { useSession } from '../hooks/useSession.js'
import { deleteAccount, logout } from '../utils/account.js'
import { formatLongDate } from '../utils/format.js'
import './AccountPage.css'

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

/** Tu cuenta: datos, favoritos guardados, cerrar sesion y borrar la cuenta. */
export default function AccountPage() {
  const navigate = useNavigate()
  const session = useSession()
  const lines = useFavoriteList('lineas').ids.length
  const stations = useFavoriteList('estaciones').ids.length
  const accesses = useFavoriteList('accesos').ids.length
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

  return (
    <div className="wrap content auth">
      <BackButton />
      <section className="auth-card" aria-labelledby="account-title">
        <h1 className="auth-title" id="account-title">
          Tu cuenta
        </h1>
        <dl className="account-data">
          {user.name && (
            <>
              <dt>Nombre</dt>
              <dd>{user.name}</dd>
            </>
          )}
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
            {plural(lines, 'línea', 'líneas')}, {plural(stations, 'estación', 'estaciones')} y{' '}
            {plural(accesses, 'acceso', 'accesos')}. Se sincronizan solos en todos tus dispositivos.
          </dd>
        </dl>

        <Link className="notif-account-link" to="/notificaciones">
          Avisos de tus favoritos en este dispositivo →
        </Link>

        <div className="account-actions">
          <button
            type="button"
            className="auth-submit"
            onClick={() => {
              logout()
              navigate('/')
            }}
          >
            Cerrar sesión
          </button>
        </div>

        <div className="account-danger">
          <h2>Borrar la cuenta</h2>
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
        </div>

        <p className="auth-note">
          Qué datos se guardan y para qué: <Link to="/privacidad">política de privacidad</Link>.
        </p>
      </section>
    </div>
  )
}
