import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { currentSubscription, pushSupport } from '../utils/push.js'
import './NotificationsLink.css'

const BELL = 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0'

/**
 * Invita a activar los avisos de los favoritos (o dice que estan activos).
 * compact: como enlace corto, para el encabezado del panel "Tus favoritos".
 */
export default function NotificationsLink({ compact = false }) {
  const count =
    useFavoriteList('lineas').ids.length +
    useFavoriteList('estaciones').ids.length +
    useFavoriteList('accesos').ids.length +
    useFavoriteList('colectivos').ids.length
  const [active, setActive] = useState(false)
  useEffect(() => {
    currentSubscription()
      .then((s) => setActive(Boolean(s)))
      .catch(() => {})
  }, [])
  if (count === 0 || pushSupport() === 'no') return null
  return (
    <Link
      to="/notificaciones"
      className={`notif-link${active ? ' active' : ''}${compact ? ' notif-link-compact' : ''}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={BELL} />
      </svg>
      {active
        ? compact
          ? 'Avisos activados'
          : 'Avisos activados · configurar'
        : compact
          ? 'Avisarme si hay problemas'
          : 'Avisarme cuando haya problemas en mis favoritos'}
    </Link>
  )
}
