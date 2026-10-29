import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../utils/account.js'
import './AccountPage.css'

/** "¿Olvidaste tu contraseña?": pide el mail y manda un link para elegir una nueva. */
export default function RecoverPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim())) {
      setError({ field: true, text: 'Escribí un mail válido, por ejemplo nombre@gmail.com.' })
      document.getElementById('recover-email')?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (e) {
      setError({ field: false, text: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wrap content auth">
      <section className="auth-card" aria-labelledby="recover-title">
        <h1 className="auth-title" id="recover-title">
          Recuperá tu contraseña
        </h1>
        {sent ? (
          <>
            <p className="auth-success" role="status">
              Si hay una cuenta con <strong>{email.trim()}</strong>, te mandamos un mail con un link para elegir una
              contraseña nueva. Vale por una hora.
            </p>
            <p className="auth-note">
              ¿No llega? Fijate en la carpeta de spam o promociones. Si entrabas con Google, también podés seguir
              entrando así.
            </p>
            <Link className="auth-submit auth-link-button" to="/ingresar">
              Volver a ingresar
            </Link>
          </>
        ) : (
          <>
            <p className="auth-subtitle">Escribí el mail de tu cuenta y te mandamos un link para elegir una nueva.</p>
            <form className="auth-form" noValidate onSubmit={submit}>
              <label className="auth-field">
                <span>Mail</span>
                <input
                  id="recover-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={error?.field || undefined}
                  aria-describedby={error?.field ? 'recover-email-error' : undefined}
                />
                {error?.field && (
                  <span className="auth-error" id="recover-email-error" role="alert">
                    {error.text}
                  </span>
                )}
              </label>
              {error && !error.field && (
                <p className="auth-error auth-error-box" role="alert">
                  {error.text}
                </p>
              )}
              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? 'Un momento…' : 'Mandarme el link'}
              </button>
            </form>
            <Link className="auth-skip" to="/ingresar">
              Volver
            </Link>
          </>
        )}
      </section>
    </div>
  )
}
