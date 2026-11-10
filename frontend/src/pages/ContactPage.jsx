import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSession } from '../hooks/useSession.js'
import {
  CONTACT_KINDS,
  MAX_LENGTH,
  MAX_NAME,
  contactAvailable,
  contactProblem,
  sendContact,
} from '../utils/contact.js'
import './AccountPage.css'
import './ContactPage.css'

// Solo si el formulario no esta disponible (el servidor no tiene a donde mandarlo).
const ISSUES_URL = 'https://github.com/guilleguevara245/ba-transit/issues'

const FIELD_IDS = {
  name: 'contact-name',
  lastName: 'contact-last-name',
  email: 'contact-email',
  kind: 'contact-kind',
  message: 'contact-message',
}

/**
 * Contacto: un error, una idea u otra cosa. El mensaje llega por mail a
 * quien hace el sitio, con nombre, apellido y mail de quien escribe (para
 * responderle). Con la sesion iniciada se completan solos y el servidor
 * agrega los datos de la cuenta. Si se abrio desde otra pantalla, se manda
 * cual era.
 */
export default function ContactPage() {
  const location = useLocation()
  const from = typeof location.state?.from === 'string' ? location.state.from : null
  const session = useSession()
  const user = session?.user
  // null mientras se pregunta; si el servidor no responde se muestra igual (el envio dira que paso).
  const [available, setAvailable] = useState(null)
  const [form, setForm] = useState({
    name: user?.name ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    kind: '',
    message: '',
  })
  const [website, setWebsite] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    let cancelled = false
    contactAvailable()
      .then((value) => !cancelled && setAvailable(value))
      .catch(() => !cancelled && setAvailable(true))
    return () => {
      cancelled = true
    }
  }, [])

  const set = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setError(null)
  }

  async function submit(event) {
    event.preventDefault()
    const problem = contactProblem(form)
    if (problem) {
      setError(problem)
      const target =
        problem.field === 'kind'
          ? document.querySelector('.contact-kinds input')
          : document.getElementById(FIELD_IDS[problem.field])
      target?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      await sendContact({ ...form, page: from, website })
      setSent(true)
    } catch (e) {
      setError({ field: null, text: e.message })
    } finally {
      setBusy(false)
    }
  }

  const fieldError = (field) =>
    error?.field === field ? (
      <span className="auth-error" id={`${FIELD_IDS[field]}-error`} role="alert">
        {error.text}
      </span>
    ) : null
  const describedBy = (field) => (error?.field === field ? `${FIELD_IDS[field]}-error` : undefined)
  const invalid = (field) => error?.field === field || undefined

  return (
    <div className="wrap content contact-page">
      <div className="contact-layout">
        <section className="auth-card contact-card" aria-labelledby="contact-title">
          <h1 className="auth-title" id="contact-title">
            Contacto
          </h1>

          {sent ? (
            <>
              <p className="auth-success" role="status">
                ¡Gracias, {form.name.trim()}! Tu mensaje llegó. Si hace falta, te respondemos a{' '}
                <strong>{form.email.trim()}</strong>.
              </p>
              <Link className="auth-submit auth-link-button" to={from ?? '/'}>
                Volver
              </Link>
            </>
          ) : available === false ? (
            <>
              <p className="auth-error auth-error-box" role="status">
                El formulario de contacto no está disponible por el momento.
              </p>
              <p className="auth-note">
                Mientras tanto, podés contarlo en{' '}
                <a href={ISSUES_URL} target="_blank" rel="noreferrer">
                  el repositorio del proyecto
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <p className="auth-subtitle">¿Encontraste un error o tenés una idea? Contanos.</p>
              {user && (
                <p className="auth-note contact-account">
                  Ingresaste como <strong>{user.email}</strong>: el mensaje va con los datos de tu cuenta.
                </p>
              )}
              <form className="auth-form contact-form" noValidate onSubmit={submit}>
                <div className="auth-name-row">
                  <label className="auth-field">
                    <span>Nombre</span>
                    <input
                      id={FIELD_IDS.name}
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      autoComplete="given-name"
                      maxLength={MAX_NAME}
                      aria-required="true"
                      aria-invalid={invalid('name')}
                      aria-describedby={describedBy('name')}
                    />
                    {fieldError('name')}
                  </label>
                  <label className="auth-field">
                    <span>Apellido</span>
                    <input
                      id={FIELD_IDS.lastName}
                      value={form.lastName}
                      onChange={(e) => set('lastName', e.target.value)}
                      autoComplete="family-name"
                      maxLength={MAX_NAME}
                      aria-required="true"
                      aria-invalid={invalid('lastName')}
                      aria-describedby={describedBy('lastName')}
                    />
                    {fieldError('lastName')}
                  </label>
                </div>

                <label className="auth-field">
                  <span>
                    Tu mail <small>(para responderte)</small>
                  </span>
                  <input
                    id={FIELD_IDS.email}
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    aria-required="true"
                    aria-invalid={invalid('email')}
                    aria-describedby={describedBy('email')}
                  />
                  {fieldError('email')}
                </label>

                <fieldset className="contact-fieldset">
                  <legend className="contact-legend">De qué se trata</legend>
                  <div className="contact-kinds">
                    {CONTACT_KINDS.map((k) => (
                      <label key={k.value} className={form.kind === k.value ? 'active' : undefined}>
                        <input
                          type="radio"
                          name="kind"
                          value={k.value}
                          checked={form.kind === k.value}
                          onChange={() => set('kind', k.value)}
                          aria-describedby={describedBy('kind')}
                        />
                        {k.label}
                      </label>
                    ))}
                  </div>
                  {fieldError('kind')}
                </fieldset>

                <label className="auth-field">
                  <span>Mensaje</span>
                  <textarea
                    id={FIELD_IDS.message}
                    className="contact-message"
                    rows={6}
                    maxLength={MAX_LENGTH}
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                    placeholder={
                      form.kind === 'error'
                        ? 'Qué pasó, en qué pantalla y qué esperabas que pasara.'
                        : 'Contanos lo que quieras.'
                    }
                    aria-required="true"
                    aria-invalid={invalid('message')}
                    aria-describedby={`contact-count${error?.field === 'message' ? ` ${FIELD_IDS.message}-error` : ''}`}
                  />
                  <span className="contact-count" id="contact-count">
                    {form.message.length} / {MAX_LENGTH}
                  </span>
                  {fieldError('message')}
                </label>

                {/* Trampa para bots: una persona no la ve ni la completa. */}
                <label className="contact-trap" aria-hidden="true">
                  Sitio web
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>

                {error && !error.field && (
                  <p className="auth-error auth-error-box" role="alert">
                    {error.text}
                  </p>
                )}
                <button type="submit" className="auth-submit" disabled={busy}>
                  {busy ? 'Mandando…' : 'Mandar mensaje'}
                </button>
              </form>
            </>
          )}
        </section>

        <ContactTips />
      </div>
    </div>
  )
}

/** Al lado del formulario en computadora (abajo en el celular): que conviene contar y que pasa con el mensaje. */
function ContactTips() {
  return (
    <aside className="contact-tips" aria-labelledby="contact-tips-title">
      <h2 className="contact-tips-title" id="contact-tips-title">
        Antes de escribir
      </h2>
      <ul>
        <li>
          <TipIcon d="M12 3 2.5 20h19L12 3zm0 6v5m0 3v.5" />
          <span>
            <strong>Si es un error</strong>
            Contá qué pasó, en qué pantalla y qué esperabas. La pantalla desde donde llegaste y el navegador se mandan
            solos.
          </span>
        </li>
        <li>
          <TipIcon d="M3 12h4l3-7 4 14 3-7h4" />
          <span>
            <strong>Si faltan datos</strong>
            Fijate en <Link to="/estado">Estado de los datos</Link>: a veces una fuente no responde y se arregla sola.
          </span>
        </li>
        <li>
          <TipIcon d="M3 6h18v12H3zm0 0 9 7 9-7" />
          <span>
            <strong>Te respondemos por mail</strong>
            A la dirección que dejes. El mensaje no se guarda en el sitio (más en{' '}
            <Link to="/privacidad#contacto">Privacidad</Link>).
          </span>
        </li>
      </ul>
    </aside>
  )
}

function TipIcon({ d }) {
  return (
    <svg className="contact-tips-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  )
}
