import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { useSession } from '../hooks/useSession.js'
import './AccountInvite.css'

const DISMISSED_KEY = 'ba-transit:invitacion-cuenta'

function wasDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Invitacion a crear una cuenta, en el inicio. Aparece recien cuando hay
 * algun favorito (ahi es cuando sirve) y, si se elige "Seguir sin
 * registrarte", no vuelve a aparecer.
 */
export default function AccountInvite() {
  const session = useSession()
  const count =
    useFavoriteList('lineas').ids.length + useFavoriteList('estaciones').ids.length + useFavoriteList('accesos').ids.length
  const [dismissed, setDismissed] = useState(wasDismissed)
  if (session || dismissed || count === 0) return null

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Sin almacenamiento: se oculta hasta recargar.
    }
    setDismissed(true)
  }

  return (
    <aside className="account-invite" aria-label="Crear una cuenta">
      <p>
        <strong>Tus favoritos, en todos tus dispositivos.</strong> Ingresá con Google o con tu mail y se guardan en tu
        cuenta.
      </p>
      <div className="account-invite-actions">
        <Link to="/ingresar" className="account-invite-go">
          Ingresar
        </Link>
        <button type="button" className="account-invite-skip" onClick={dismiss}>
          Seguir sin registrarte
        </button>
      </div>
    </aside>
  )
}
