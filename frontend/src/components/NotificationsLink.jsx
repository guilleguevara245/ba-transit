import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { currentSubscription, pushSupport } from '../utils/push.js'
import './NotificationsLink.css'

const BELL = 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0'

/** Debajo de los favoritos del inicio: invita a activar los avisos (o dice que estan activos). */
export default function NotificationsLink() {
  const count =
    useFavoriteList('lineas').ids.length + useFavoriteList('estaciones').ids.length + useFavoriteList('accesos').ids.length
  const [active, setActive] = useState(false)
  useEffect(() => {
    currentSubscription()
      .then((s) => setActive(Boolean(s)))
      .catch(() => {})
  }, [])
  if (count === 0 || pushSupport() === 'no') return null
  return (
    <Link to="/notificaciones" className={active ? 'notif-link active' : 'notif-link'}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={BELL} />
      </svg>
      {active ? 'Avisos activados · configurar' : 'Avisarme cuando haya problemas en mis favoritos'}
    </Link>
  )
}
