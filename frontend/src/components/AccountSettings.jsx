import { useCallback, useEffect, useState } from 'react'
import {
  changePassword,
  closeDevice,
  closeOtherSessions,
  downloadMyData,
  listDevices,
  rename,
} from '../utils/account.js'
import { formatLongDate, formatRelativeTime } from '../utils/format.js'

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

/** Nombre y apellido de la cuenta, con "Cambiar" para editarlos ahi mismo. */
export function NameEditor({ user, short = false }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name ?? '')
  const [lastName, setLastName] = useState(user.lastName ?? '')
  const { busy, error, run, setError } = useAction()

  if (!editing) {
    return (
      <button
        type="button"
        className="account-inline-link"
        onClick={() => {
          setName(user.name ?? '')
          setLastName(user.lastName ?? '')
          setError(null)
          setEditing(true)
        }}
      >
        {short ? (user.name ? 'Cambiar' : 'Agregar') : user.name ? 'Cambiar nombre' : 'Agregar tu nombre'}
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
        if (await run(() => rename(name, lastName))) setEditing(false)
      }}
    >
      <div className="auth-name-row">
        <label className="auth-field">
          <span>Nombre</span>
          <input
            value={name}
            maxLength={80}
            autoComplete="given-name"
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <span className="auth-hint">Con este te saludamos en el inicio.</span>
        </label>
        <label className="auth-field">
          <span>
            Apellido <small>(opcional)</small>
          </span>
          <input
            value={lastName}
            maxLength={80}
            autoComplete="family-name"
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>
      </div>
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
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
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

const DEVICE_ICONS = {
  computadora: 'M3 4h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 20h8M12 16v4',
  celular: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  tablet: 'M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
}

/** "desde el 29 de octubre de 2026". */
const since = (iso) => `desde el ${formatLongDate(iso.slice(0, 10))}`

/**
 * Dispositivos con la cuenta abierta: este (marcado) y los demas, cada uno
 * con su "Cerrar sesión", y "Cerrar todas las demás".
 */
export function DevicesSection() {
  const [devices, setDevices] = useState(null)
  const { busy, error, done, run } = useAction()

  const load = useCallback(
    () =>
      listDevices()
        .then(setDevices)
        .catch(() => setDevices([])),
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  const others = (devices ?? []).filter((d) => !d.current)

  return (
    <div className="account-subsection">
      <p className="account-help">
        Dónde está abierta tu cuenta. Si no reconocés alguno, cerrá su sesión: en ese dispositivo vas a tener que volver
        a entrar.
      </p>
      {devices === null && <p className="account-help">Cargando…</p>}
      {devices && (
        <ul className="account-devices">
          {devices.map((d) => (
            <li key={d.id}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d={DEVICE_ICONS[d.kind] ?? DEVICE_ICONS.computadora} />
              </svg>
              <div>
                <strong>
                  {d.device}
                  {d.current && <span className="account-device-tag">Este dispositivo</span>}
                </strong>
                <small>
                  {d.current ? 'Activo ahora' : `Último uso ${formatRelativeTime(d.lastSeenAt)}`} · {since(d.createdAt)}
                </small>
              </div>
              {!d.current && (
                <button
                  type="button"
                  className="account-secondary"
                  disabled={busy}
                  aria-label={`Cerrar la sesión de ${d.device}`}
                  onClick={() =>
                    run(async () => {
                      await closeDevice(d.id)
                      await load()
                    }, `Cerramos la sesión de ${d.device}.`)
                  }
                >
                  Cerrar sesión
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <Feedback error={error} done={done} />
      {others.length > 1 && (
        <button
          type="button"
          className="account-secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await closeOtherSessions()
              await load()
            }, 'Listo: cerramos la sesión en todos tus otros dispositivos.')
          }
        >
          {busy ? 'Cerrando…' : 'Cerrar todas las demás'}
        </button>
      )}
    </div>
  )
}

/** Descargar todo lo que guarda la cuenta (JSON). */
export function DataSection({ heading = true }) {
  const { busy, error, run } = useAction()
  return (
    <div className="account-subsection">
      {heading && <h3>Tus datos</h3>}
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
