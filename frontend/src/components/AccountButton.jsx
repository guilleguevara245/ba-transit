import { Link } from 'react-router-dom'
import { useSession } from '../hooks/useSession.js'
import UserAvatar from './UserAvatar.jsx'

const USER_ICON = 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0'

/** Boton de la cuenta en el header: "Ingresar" sin sesion; con sesion, la imagen de la cuenta. */
export default function AccountButton() {
  const session = useSession()
  const user = session?.user
  if (!user) {
    return (
      <Link to="/ingresar" className="account-button" aria-label="Ingresar o crear una cuenta" title="Ingresar">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d={USER_ICON} />
        </svg>
      </Link>
    )
  }
  return (
    <Link to="/cuenta" className="account-button signed-in" aria-label={`Tu cuenta (${user.email})`} title={user.email}>
      <UserAvatar user={user} size={28} />
    </Link>
  )
}
