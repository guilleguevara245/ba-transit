import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { currentSubscription, pushSupport } from '../utils/push.js'
import './NotificationsLink.css'

const BELL = 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0'

/** Cuanto suena la campana al hacer clic antes de abrir los avisos (como en el CSS). */
const RING_MS = 450

function prefersLessMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

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
  const [ringing, setRinging] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    currentSubscription()
      .then((s) => setActive(Boolean(s)))
      .catch(() => {})
  }, [])
  useEffect(() => {
    if (!ringing) return undefined
    const timer = setTimeout(() => navigate('/notificaciones'), RING_MS)
    return () => clearTimeout(timer)
  }, [ringing, navigate])
  if (count === 0 || pushSupport() === 'no') return null

  // Al hacer clic la campana suena y despues se abren los avisos. Con
  // Ctrl, Cmd o la rueda (abrir en otra pestaña) o con menos movimiento
  // pedido, el enlace funciona como siempre.
  function ring(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (prefersLessMotion()) return
    event.preventDefault()
    setRinging(true)
  }

  return (
    <Link
      to="/notificaciones"
      onClick={ring}
      className={`notif-link${active ? ' active' : ''}${compact ? ' notif-link-compact' : ''}${ringing ? ' ringing' : ''}`}
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
