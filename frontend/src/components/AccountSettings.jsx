import { useState } from 'react'
import { changePassword, closeOtherSessions, downloadMyData, rename } from '../utils/account.js'

const MIN_PASSWORD = 8

/** Corre una accion de la cuenta con su estado: ocupado, error y mensaje de exito. */
function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)
  async function run(action, okText) {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      await action()
      setDone(okText)
      return true
    } catch (e) {
      setError(e.message || 'Algo salió mal. Probá de nuevo.')
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, done, run, setError, setDone }
}

function Feedback({ error, done }) {
  if (error) {
    return (
      <p className="auth-error auth-error-box" role="alert">
        {error}
      </p>
    )
  }
  return done ? (
    <p className="auth-success" role="status">
      {done}
    </p>
  ) : null
}

/** El nombre de la cuenta, con "Cambiar" para editarlo ahi mismo. */
export function NameEditor({ user }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name ?? '')
  const { busy, error, run, setError } = useAction()

  if (!editing) {
    return (
      <button
        type="button"
        className="account-inline-link"
        onClick={() => {
          setName(user.name ?? '')
          setError(null)
          setEditing(true)
        }}
      >
        {user.name ? 'Cambiar nombre' : 'Agregar tu nombre'}
      </button>
    )
  }
  return (
    <form
      className="account-name-form"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault()
        if (!name.trim()) return setError('Escribí tu nombre.')
        if (await run(() => rename(name))) setEditing(false)
      }}
    >
      <label className="auth-field">
        <span>Tu nombre</span>
        <input value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <Feedback error={error} />
      <div className="account-form-actions">
        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="auth-skip" onClick={() => setEditing(false)} disabled={busy}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function PasswordInput({ id, label, value, onChange, autoComplete, hint }) {
  const [show, setShow] = useState(false)
  return (
    <label className="auth-field" htmlFor={id}>
      <span>{label}</span>
      <span className="auth-password">
        <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} />
        <button type="button" className="auth-show" aria-pressed={show} onClick={() => setShow((v) => !v)}>
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
      </span>
      {hint && <span className="auth-hint">{hint}</span>}
    </label>
  )
}

/** Agregar (cuentas de Google) o cambiar la contraseña. Cierra las otras sesiones. */
export function PasswordSection({ user }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, done, run, setError, setDone } = useAction()
  const adding = !user.hasPassword

  return (
    <div className="account-subsection">
      <h3>Contraseña</h3>
      <p className="account-help">
        {adding
          ? 'Entrás con Google. Si agregás una contraseña, también vas a poder entrar con tu mail.'
          : 'Al cambiarla se cierra la sesión en tus otros dispositivos.'}
      </p>
      {!open ? (
        <>
          <Feedback done={done} />
          <button
            type="button"
            className="account-secondary"
            onClick={() => {
              setOpen(true)
              setDone(null)
              setError(null)
            }}
          >
            {adding ? 'Agregar una contraseña' : 'Cambiar la contraseña'}
          </button>
        </>
      ) : (
        <form
          className="account-password-form"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault()
            if (!adding && !current) return setError('Escribí tu contraseña actual.')
            if (password.length < MIN_PASSWORD) {
              return setError(`La contraseña nueva tiene que tener al menos ${MIN_PASSWORD} caracteres.`)
            }
            const ok = await run(
              () => changePassword(adding ? null : current, password),
              adding
                ? 'Listo: ahora también podés entrar con tu mail y esta contraseña.'
                : 'Contraseña cambiada. Cerramos la sesión en tus otros dispositivos.',
            )
            if (ok) {
              setOpen(false)
              setCurrent('')
              setPassword('')
            }
          }}
        >
          {!adding && (
            <PasswordInput
              id="cuenta-actual"
              label="Contraseña actual"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          )}
          <PasswordInput
            id="cuenta-nueva"
            label={adding ? 'Contraseña' : 'Contraseña nueva'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            hint={`Al menos ${MIN_PASSWORD} caracteres.`}
          />
          <Feedback error={error} />
          <div className="account-form-actions">
            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="auth-skip" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

/** Cerrar la sesion en los demas dispositivos. */
export function SessionsSection() {
  const { busy, error, done, run } = useAction()
  return (
    <div className="account-subsection">
      <h3>Dispositivos</h3>
      <p className="account-help">
        Si entraste en una computadora que no es tuya o perdiste el celular, cerrá la sesión en todos los demás. Acá
        seguís adentro.
      </p>
      <Feedback error={error} done={done} />
      <button
        type="button"
        className="account-secondary"
        disabled={busy}
        onClick={() => run(closeOtherSessions, 'Listo: cerramos la sesión en todos tus otros dispositivos.')}
      >
        {busy ? 'Cerrando…' : 'Cerrar las otras sesiones'}
      </button>
    </div>
  )
}

/** Descargar todo lo que guarda la cuenta (JSON). */
export function DataSection() {
  const { busy, error, run } = useAction()
  return (
    <div className="account-subsection">
      <h3>Tus datos</h3>
      <p className="account-help">
        Un archivo con todo lo que guarda tu cuenta: datos, favoritos, lugares, preferencias y avisos. Nunca incluye tu
        contraseña.
      </p>
      <Feedback error={error} />
      <button type="button" className="account-secondary" disabled={busy} onClick={() => run(downloadMyData)}>
        {busy ? 'Preparando…' : 'Descargar mis datos'}
      </button>
    </div>
  )
}
