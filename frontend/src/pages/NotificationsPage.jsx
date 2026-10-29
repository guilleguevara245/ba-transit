import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import Select from '../components/Select.jsx'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { currentSubscription, disablePush, enablePush, pushSupport, readPrefs, testPush, updatePush } from '../utils/push.js'
import './AccountPage.css'
import './NotificationsPage.css'

const KINDS = [
  { key: 'lineas', label: 'Mis líneas', hint: 'Demoras, interrupciones y obras en tus líneas.' },
  { key: 'estaciones', label: 'Mis estaciones', hint: 'Cuando una alerta nombra a tu estación (cerrada, sin parada…).' },
  { key: 'accesos', label: 'Mis accesos', hint: 'Cuando un acceso se congestiona o se corta, y en qué mano.' },
]
const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: h, label: `${String(h).padStart(2, '0')}:00` }))

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

/** Avisos de este navegador: activar, elegir que avisar, horario sin avisos, probar y apagar. */
export default function NotificationsPage() {
  const support = pushSupport()
  const [subscribed, setSubscribed] = useState(null)
  const [prefs, setPrefs] = useState(readPrefs)
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'error', text }
  const [busy, setBusy] = useState(false)
  const lines = useFavoriteList('lineas').ids.length
  const stations = useFavoriteList('estaciones').ids.length
  const accesses = useFavoriteList('accesos').ids.length
  const denied = support === 'ok' && window.Notification.permission === 'denied'

  useEffect(() => {
    currentSubscription()
      .then((s) => setSubscribed(Boolean(s)))
      .catch(() => setSubscribed(false))
  }, [])

  async function run(action, okText) {
    setBusy(true)
    setStatus(null)
    try {
      const result = await action()
      if (okText) setStatus({ kind: 'ok', text: typeof okText === 'function' ? okText(result) : okText })
    } catch (e) {
      setStatus({ kind: 'error', text: e.message || 'Algo salió mal. Probá de nuevo.' })
    } finally {
      setBusy(false)
    }
  }

  function enable() {
    run(async () => {
      const result = await enablePush(prefs)
      if (result === 'activado') setSubscribed(true)
      if (result === 'denegado') throw new Error('Bloqueaste los avisos para este sitio. Habilitalos desde el candado al lado de la dirección.')
      if (result === 'cancelado') throw new Error('No se activaron los avisos: el navegador no dio permiso.')
    }, 'Listo: los avisos quedaron activados en este navegador.')
  }

  function change(next) {
    setPrefs(next)
    if (subscribed) run(() => updatePush(next), 'Cambios guardados.')
    else updatePush(next).catch(() => {})
  }

  const toggleKind = (key) =>
    change({ ...prefs, kinds: prefs.kinds.includes(key) ? prefs.kinds.filter((k) => k !== key) : [...prefs.kinds, key] })

  return (
    <div className="wrap content auth notif-page">
      <BackButton />
      <section className="auth-card" aria-labelledby="notif-title">
        <h1 className="auth-title" id="notif-title">
          Avisos
        </h1>
        <p className="auth-subtitle">
          Te avisamos en este dispositivo cuando hay problemas en tus favoritos: seguís{' '}
          {plural(lines, 'línea', 'líneas')}, {plural(stations, 'estación', 'estaciones')} y{' '}
          {plural(accesses, 'acceso', 'accesos')}.
        </p>
        {lines + stations + accesses === 0 && (
          <p className="auth-note">
            Todavía no tenés favoritos: tocá la ★ en una línea, estación o acceso para que te avisemos de ellos.
          </p>
        )}

        {support === 'no' && (
          <p className="auth-error auth-error-box">Este navegador no permite avisos. Probá con Chrome, Edge, Firefox o Safari.</p>
        )}
        {support === 'ios-sin-instalar' && (
          <div className="notif-ios">
            <strong>En iPhone, primero instalá BA Transit:</strong>
            <ol>
              <li>
                Tocá <b>Compartir</b> (el cuadrado con la flecha hacia arriba) en Safari.
              </li>
              <li>
                Elegí <b>Agregar a inicio</b>.
              </li>
              <li>Abrí BA Transit desde el ícono nuevo y volvé a esta página.</li>
            </ol>
            <span>Es una regla de Apple: los avisos de sitios web solo llegan a las apps instaladas.</span>
          </div>
        )}

        {support === 'ok' && subscribed === false && (
          <>
            {denied && (
              <p className="auth-error auth-error-box">
                Bloqueaste los avisos para este sitio. Habilitalos desde el candado al lado de la dirección y volvé a
                probar.
              </p>
            )}
            <button type="button" className="auth-submit" onClick={enable} disabled={busy || denied}>
              {busy ? 'Un momento…' : 'Activar avisos'}
            </button>
          </>
        )}

        {support === 'ok' && subscribed && (
          <div className="notif-on">
            <span className="notif-on-dot" aria-hidden="true" />
            <span>Avisos activados en este dispositivo.</span>
          </div>
        )}

        {status && (
          <p className={status.kind === 'ok' ? 'auth-success' : 'auth-error auth-error-box'} role="status">
            {status.text}
          </p>
        )}

        {support !== 'no' && (
          <fieldset className="notif-prefs" disabled={busy}>
            <legend>Qué avisar</legend>
            {KINDS.map((k) => (
              <label key={k.key} className="notif-check">
                <input type="checkbox" checked={prefs.kinds.includes(k.key)} onChange={() => toggleKind(k.key)} />
                <span>
                  {k.label}
                  <small>{k.hint}</small>
                </span>
              </label>
            ))}
            <label className="notif-check">
              <input
                type="checkbox"
                checked={prefs.notifyResolved}
                onChange={() => change({ ...prefs, notifyResolved: !prefs.notifyResolved })}
              />
              <span>
                Avisarme cuando se normaliza
                <small>Por ejemplo, “Línea B: volvió a funcionar normal”.</small>
              </span>
            </label>
          </fieldset>
        )}

        {support !== 'no' && (
          <fieldset className="notif-prefs" disabled={busy}>
            <legend>Horario</legend>
            <label className="notif-check">
              <input type="checkbox" checked={prefs.quiet} onChange={() => change({ ...prefs, quiet: !prefs.quiet })} />
              <span>
                Sin avisos de noche
                <small>Lo que pase en ese horario no se avisa después.</small>
              </span>
            </label>
            {prefs.quiet && (
              <div className="notif-hours">
                <div className="auth-field">
                  <span id="quiet-from">Desde</span>
                  <Select labelledBy="quiet-from" value={prefs.quietFrom} options={HOURS} onChange={(v) => change({ ...prefs, quietFrom: v })} />
                </div>
                <div className="auth-field">
                  <span id="quiet-to">Hasta</span>
                  <Select labelledBy="quiet-to" value={prefs.quietTo} options={HOURS} onChange={(v) => change({ ...prefs, quietTo: v })} />
                </div>
              </div>
            )}
          </fieldset>
        )}

        {support === 'ok' && subscribed && (
          <div className="notif-actions">
            <button type="button" className="auth-submit" disabled={busy} onClick={() => run(testPush, 'Te mandamos un aviso de prueba: debería llegar en unos segundos.')}>
              Mandarme un aviso de prueba
            </button>
            <button
              type="button"
              className="auth-skip"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await disablePush()
                  setSubscribed(false)
                }, 'Avisos apagados en este dispositivo.')
              }
            >
              Apagar avisos
            </button>
          </div>
        )}

        <p className="auth-note">
          Los avisos son de este dispositivo y no necesitan cuenta. Qué se guarda: <Link to="/privacidad">política de privacidad</Link>.
        </p>
      </section>
    </div>
  )
}
