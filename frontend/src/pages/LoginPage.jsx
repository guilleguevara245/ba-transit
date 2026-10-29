import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GoogleButton from '../components/GoogleButton.jsx'
import { useApi } from '../hooks/useApi.js'
import { useSession } from '../hooks/useSession.js'
import { useTheme } from '../hooks/useTheme.js'
import { login, loginWithGoogle, register } from '../utils/account.js'
import './AccountPage.css'

const MIN_PASSWORD = 8

function validate(mode, { email, password }) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim())) return { field: 'email', text: 'Escribí un mail válido, por ejemplo nombre@gmail.com.' }
  if (!password) return { field: 'password', text: 'Escribí tu contraseña.' }
  if (mode === 'registro' && password.length < MIN_PASSWORD) {
    return { field: 'password', text: `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.` }
  }
  return null
}

/**
 * Ingresar o crear una cuenta: con Google o con mail y contraseña. La
 * cuenta es opcional: "Seguir sin registrarte" vuelve al sitio.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const session = useSession()
  const { theme } = useTheme()
  const { data: config } = useApi('/api/v1/auth/config')
  const [mode, setMode] = useState('ingreso')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Con sesion no hay nada que hacer aca.
  useEffect(() => {
    if (session) navigate('/cuenta', { replace: true })
  }, [session, navigate])

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    if (error?.field === field) setError(null)
  }

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError({ field: null, text: e.message })
    } finally {
      setBusy(false)
    }
  }

  function submit(event) {
    event.preventDefault()
    const problem = validate(mode, form)
    if (problem) {
      setError(problem)
      document.getElementById(`auth-${problem.field}`)?.focus()
      return
    }
    const data = { email: form.email.trim(), password: form.password, name: form.name.trim() || undefined }
    run(() => (mode === 'registro' ? register(data) : login(data)))
  }

  const fieldError = (field) => (error?.field === field ? error.text : null)

  return (
    <div className="wrap content auth">
      <section className="auth-card" aria-labelledby="auth-title">
        <h1 className="auth-title" id="auth-title">
          {mode === 'registro' ? 'Creá tu cuenta' : 'Ingresá a BA Transit'}
        </h1>
        <p className="auth-subtitle">
          Con una cuenta, tus líneas, estaciones y accesos favoritos te siguen a cualquier dispositivo. Es opcional: el
          sitio funciona igual sin ella.
        </p>

        {config?.googleClientId && (
          <>
            <GoogleButton
              clientId={config.googleClientId}
              dark={theme === 'dark'}
              onCredential={(credential) => run(() => loginWithGoogle(credential))}
            />
            <div className="auth-divider">
              <span>o con tu mail</span>
            </div>
          </>
        )}

        <div className="auth-tabs" role="tablist" aria-label="Ingresar o crear cuenta">
          {[
            ['ingreso', 'Ingresar'],
            ['registro', 'Crear cuenta'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              className={mode === value ? 'active' : undefined}
              onClick={() => {
                setMode(value)
                setError(null)
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <form className="auth-form" noValidate onSubmit={submit}>
          {mode === 'registro' && (
            <label className="auth-field">
              <span>
                Nombre <small>(opcional, para saludarte)</small>
              </span>
              <input value={form.name} onChange={update('name')} autoComplete="given-name" maxLength={80} />
            </label>
          )}
          <label className="auth-field">
            <span>Mail</span>
            <input
              id="auth-email"
              type="email"
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
              inputMode="email"
              aria-invalid={Boolean(fieldError('email')) || undefined}
              aria-describedby={fieldError('email') ? 'auth-email-error' : undefined}
            />
            {fieldError('email') && (
              <span className="auth-error" id="auth-email-error" role="alert">
                {fieldError('email')}
              </span>
            )}
          </label>
          <label className="auth-field">
            <span>Contraseña</span>
            <span className="auth-password">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={update('password')}
                autoComplete={mode === 'registro' ? 'new-password' : 'current-password'}
                aria-invalid={Boolean(fieldError('password')) || undefined}
                aria-describedby={fieldError('password') ? 'auth-password-error' : undefined}
              />
              <button
                type="button"
                className="auth-show"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </span>
            {fieldError('password') && (
              <span className="auth-error" id="auth-password-error" role="alert">
                {fieldError('password')}
              </span>
            )}
            {mode === 'registro' && !fieldError('password') && (
              <span className="auth-hint">Al menos {MIN_PASSWORD} caracteres.</span>
            )}
          </label>

          {error && !error.field && (
            <p className="auth-error auth-error-box" role="alert">
              {error.text}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Un momento…' : mode === 'registro' ? 'Crear cuenta' : 'Ingresar'}
          </button>
          {mode === 'registro' && (
            <p className="auth-note">
              Al crear la cuenta aceptás la <Link to="/privacidad">política de privacidad</Link>.
            </p>
          )}
        </form>

        <button type="button" className="auth-skip" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
          Seguir sin registrarte
        </button>
      </section>
    </div>
  )
}
