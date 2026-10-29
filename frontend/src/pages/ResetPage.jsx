import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../utils/account.js'
import './AccountPage.css'

const MIN_PASSWORD = 8

/** Link del mail de recuperacion (/restablecer?codigo=...): elegir la contraseña nueva. */
export default function ResetPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const code = searchParams.get('codigo')
  const [form, setForm] = useState({ password: '', repeat: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setError(null)
  }

  async function submit(event) {
    event.preventDefault()
    if (form.password.length < MIN_PASSWORD) {
      setError({ field: 'password', text: `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.` })
      return
    }
    if (form.password !== form.repeat) {
      setError({ field: 'repeat', text: 'Las dos contraseñas no coinciden.' })
      return
    }
    setBusy(true)
    try {
      await resetPassword(code, form.password)
      navigate('/cuenta', { replace: true })
    } catch (e) {
      setError({ field: null, text: e.message })
      setBusy(false)
    }
  }

  if (!code) {
    return (
      <div className="wrap content auth">
        <section className="auth-card">
          <h1 className="auth-title">Link incompleto</h1>
          <p className="auth-subtitle">
            Abrí el link tal cual llegó en el mail, o pedí uno nuevo desde “¿Olvidaste tu contraseña?”.
          </p>
          <Link className="auth-submit auth-link-button" to="/recuperar">
            Pedir un link nuevo
          </Link>
        </section>
      </div>
    )
  }

  const fieldError = (field) => (error?.field === field ? error.text : null)

  return (
    <div className="wrap content auth">
      <section className="auth-card" aria-labelledby="reset-title">
        <h1 className="auth-title" id="reset-title">
          Elegí una contraseña nueva
        </h1>
        <p className="auth-subtitle">Al guardarla se cierra la sesión en tus otros dispositivos.</p>
        <form className="auth-form" noValidate onSubmit={submit}>
          {[
            ['password', 'Contraseña nueva'],
            ['repeat', 'Repetila'],
          ].map(([field, label]) => (
            <label className="auth-field" key={field}>
              <span>{label}</span>
              <span className="auth-password">
                <input
                  type={show ? 'text' : 'password'}
                  value={form[field]}
                  onChange={update(field)}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldError(field)) || undefined}
                />
                {field === 'password' && (
                  <button type="button" className="auth-show" aria-pressed={show} onClick={() => setShow((v) => !v)}>
                    {show ? 'Ocultar' : 'Mostrar'}
                  </button>
                )}
              </span>
              {fieldError(field) ? (
                <span className="auth-error" role="alert">
                  {fieldError(field)}
                </span>
              ) : (
                field === 'password' && <span className="auth-hint">Al menos {MIN_PASSWORD} caracteres.</span>
              )}
            </label>
          ))}
          {error && !error.field && (
            <p className="auth-error auth-error-box" role="alert">
              {error.text}
            </p>
          )}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar y entrar'}
          </button>
        </form>
        {error && !error.field && (
          <Link className="auth-skip" to="/recuperar">
            Pedir un link nuevo
          </Link>
        )}
      </section>
    </div>
  )
}
