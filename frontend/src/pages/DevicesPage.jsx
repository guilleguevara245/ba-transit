import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DevicesSection } from '../components/AccountSettings.jsx'
import AccountShell from '../components/AccountShell.jsx'
import { useSession } from '../hooks/useSession.js'

/** Dispositivos: donde esta abierta la cuenta y cerrar las sesiones que no se reconocen. */
export default function DevicesPage() {
  const navigate = useNavigate()
  const session = useSession()

  useEffect(() => {
    if (!session) navigate('/ingresar', { replace: true })
  }, [session, navigate])
  if (!session) return null

  return (
    <AccountShell active="dispositivos">
      <section className="account-card account-sheet" aria-labelledby="devices-title">
        <h1 className="auth-title" id="devices-title">
          Dispositivos
        </h1>
        <DevicesSection />
        <p className="auth-note">
          Cada dispositivo guarda sus propios avisos: se eligen en <Link to="/notificaciones">Avisos</Link>.
        </p>
      </section>
    </AccountShell>
  )
}
