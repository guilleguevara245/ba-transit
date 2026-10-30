import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import Select from '../components/Select.jsx'
import { useFavoriteList } from '../hooks/useFavoriteList.js'
import { isPaused, pauseLabel } from '../utils/notifPrefs.js'
import {
  currentSubscription,
  disablePush,
  enablePush,
  pausePush,
  pushSupport,
  readPrefs,
  testPush,
  updatePush,
} from '../utils/push.js'
import './AccountPage.css'
import './NotificationsPage.css'

const KINDS = [
  { key: 'lineas', label: 'Mis líneas', hint: 'Demoras, interrupciones y obras en tus líneas.' },
  { key: 'estaciones', label: 'Mis estaciones', hint: 'Cuando una alerta nombra a tu estación (cerrada, sin parada…).' },
  { key: 'accesos', label: 'Mis accesos', hint: 'Cuando un acceso se congestiona o se corta, y en qué mano.' },
]
// Avisos que no dependen de un favorito puntual (los servicios especiales, de tus líneas).
const EXTRA_KINDS = [
  { key: 'clima', label: 'Alertas del clima', hint: 'Alertas del Servicio Meteorológico para la Ciudad y el conurbano.' },
  { key: 'tarifas', label: 'Cambios de tarifa', hint: 'Cuando cambia el boleto de subte, colectivo o tren, y desde cuándo.' },
  {
    key: 'especiales',
    label: 'Servicios especiales',
    hint: 'Trenes rápidos, recorridos distintos y cambios por obras en tus líneas.',
  },
]
const LAST_TRAIN_OPTIONS = [15, 30, 45, 60].map((m) => ({ value: m, label: m === 60 ? '1 hora antes' : `${m} minutos antes` }))
const PAUSES = [
  ['hora', '1 hora'],
  ['manana', 'Hasta mañana'],
  ['lunes', 'Hasta el lunes'],
]
const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: h, label: `${String(h).padStart(2, '0')}:00` }))
// Resumen: cada 15 minutos, de 05:00 a 23:45.
const SUMMARY_TIMES = Array.from({ length: 76 }, (_, i) => {
  const minutes = 5 * 60 + i * 15
  const label = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  return { value: label, label }
})
const DAYS = [
  [1, 'L', 'lunes'],
  [2, 'M', 'martes'],
  [3, 'M', 'miércoles'],
  [4, 'J', 'jueves'],
  [5, 'V', 'viernes'],
  [6, 'S', 'sábado'],
  [7, 'D', 'domingo'],
]

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

  // El estado de la pausa se ve en su bloque: no hace falta otro mensaje.
  const pause = (option) => run(async () => setPrefs(await pausePush(option)))
  const paused = isPaused(prefs)

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
          Te avisamos en este dispositivo cuando hay problemas en tus favoritos (seguís{' '}
          {plural(lines, 'línea', 'líneas')}, {plural(stations, 'estación', 'estaciones')} y{' '}
          {plural(accesses, 'acceso', 'accesos')}) y, si querés, del clima, las tarifas y el último subte.
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
          <div className={paused ? 'notif-on paused' : 'notif-on'}>
            <span className="notif-on-dot" aria-hidden="true" />
            <span>
              {paused ? `Avisos pausados ${pauseLabel(prefs.pausedUntil)}.` : 'Avisos activados en este dispositivo.'}
            </span>
          </div>
        )}

        {support === 'ok' && subscribed && (
          <div className="notif-pause">
            {paused ? (
              <button type="button" className="notif-pause-resume" disabled={busy} onClick={() => pause(null)}>
                Reanudar los avisos
              </button>
            ) : (
              <>
                <span id="notif-pause-label">Pausar</span>
                <div className="image-picker-tabs" role="group" aria-labelledby="notif-pause-label">
                  {PAUSES.map(([option, label]) => (
                    <button key={option} type="button" disabled={busy} onClick={() => pause(option)}>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {status && (
          <p className={status.kind === 'ok' ? 'auth-success' : 'auth-error auth-error-box'} role="status">
            {status.text}
          </p>
        )}

        {support !== 'no' && (
          <fieldset className="notif-prefs" disabled={busy}>
            <legend>Resumen de tus favoritos</legend>
            <label className="notif-check">
              <input type="checkbox" checked={prefs.summary} onChange={() => change({ ...prefs, summary: !prefs.summary })} />
              <span>
                Resumen diario
                <small>Un solo aviso con el estado de todas tus líneas, estaciones y accesos.</small>
              </span>
            </label>
            {prefs.summary && (
              <div className="notif-summary">
                <div className="auth-field">
                  <span id="summary-time">A las</span>
                  <Select
                    labelledBy="summary-time"
                    value={prefs.summaryTime}
                    options={SUMMARY_TIMES}
                    onChange={(v) => change({ ...prefs, summaryTime: v })}
                  />
                </div>
                <div className="notif-days" role="group" aria-label="Días del resumen">
                  {DAYS.map(([day, letter, name]) => {
                    const on = prefs.summaryDays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        className={on ? 'notif-day on' : 'notif-day'}
                        aria-pressed={on}
                        aria-label={name}
                        title={name}
                        onClick={() => {
                          const days = on ? prefs.summaryDays.filter((d) => d !== day) : [...prefs.summaryDays, day]
                          if (days.length > 0) change({ ...prefs, summaryDays: days.sort((a, b) => a - b) })
                        }}
                      >
                        {letter}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </fieldset>
        )}

        {support !== 'no' && (
          <fieldset className="notif-prefs" disabled={busy}>
            <legend>De tus favoritos</legend>
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
            <legend>Además</legend>
            {EXTRA_KINDS.map((k) => (
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
                checked={prefs.lastTrain}
                onChange={() => change({ ...prefs, lastTrain: !prefs.lastTrain })}
              />
              <span>
                Último subte
                <small>
                  Antes del último subte o Premetro de tus líneas (y las de tus estaciones). Llega aunque sea horario
                  sin avisos.
                </small>
              </span>
            </label>
            {prefs.lastTrain && (
              <div className="notif-summary">
                <div className="auth-field notif-last-train">
                  <span id="last-train">Avisarme</span>
                  <Select
                    labelledBy="last-train"
                    value={prefs.lastTrainMinutes}
                    options={LAST_TRAIN_OPTIONS}
                    onChange={(v) => change({ ...prefs, lastTrainMinutes: v })}
                  />
                </div>
              </div>
            )}
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
