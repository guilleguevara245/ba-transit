import { useState } from 'react'
import { useNow } from '../hooks/useNow.js'
import { useSession } from '../hooks/useSession.js'
import { useVisitorName } from '../hooks/useVisitorName.js'
import { MAX_NAME_LENGTH, greetingFor, longToday } from '../utils/greeting.js'
import { festiveFor } from '../utils/festive.js'
import { firstName } from '../utils/session.js'
import './Greeting.css'

const PENCIL = 'M4 20h4L19 9l-4-4L4 16v4zm10-14 4 4'

/**
 * Saludo del inicio segun la hora ("Buenas tardes, Guillermo"). Con
 * cuenta, el nombre es el de la cuenta (se cambia en Tu cuenta). Sin
 * cuenta es opcional: se pide con un enlace chico y se guarda en el
 * navegador.
 */
export default function Greeting() {
  const now = useNow(60_000)
  const session = useSession()
  const visitor = useVisitorName()
  const signedIn = Boolean(session?.user)
  const name = signedIn ? (firstName(session.user) ?? '') : visitor.name
  const setName = visitor.setName
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  // Fechas especiales: saludo y frase propios (ver utils/festive.js).
  const festive = festiveFor(now)
  const showName = name && festive.withName

  function startEditing() {
    setDraft(name)
    setEditing(true)
  }

  function save(event) {
    event.preventDefault()
    setName(draft)
    setEditing(false)
  }

  return (
    <div className="greeting">
      {editing ? (
        <form className="greeting-form" onSubmit={save}>
          <label className="greeting-label" htmlFor="greeting-name">
            ¿Cómo te llamás?
          </label>
          <input
            id="greeting-name"
            type="text"
            autoComplete="given-name"
            maxLength={MAX_NAME_LENGTH}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && setEditing(false)}
            autoFocus
          />
          <button type="submit" className="greeting-save">
            Guardar
          </button>
          <button type="button" className="greeting-cancel" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <h1 className="greeting-title">
          {festive.greeting ?? greetingFor(now)}
          {showName && `, ${name}`}
          {festive.wave && <WavingHand />}
          {signedIn ? null : name ? (
            <button type="button" className="greeting-edit" onClick={startEditing} aria-label="Cambiar el nombre">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d={PENCIL} />
              </svg>
            </button>
          ) : (
            <button type="button" className="greeting-ask" onClick={startEditing}>
              ¿Cómo te llamás?
            </button>
          )}
        </h1>
      )}
      <p className="greeting-sub">
        {longToday(now)} · {festive.phrase ?? 'Así está el transporte ahora.'}
        {name && !editing && !signedIn && (
          <span className="greeting-private"> Tu nombre se guarda solo en este navegador.</span>
        )}
      </p>
    </div>
  )
}

/** Mano que saluda (Dia del Amigo). Quieta si el sistema pide menos movimiento. */
function WavingHand() {
  return (
    <svg className="greeting-wave" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g>
        <rect x="6.2" y="2.8" width="2.6" height="10" rx="1.3" />
        <rect x="9.3" y="1.6" width="2.6" height="11" rx="1.3" />
        <rect x="12.4" y="2.2" width="2.6" height="10.5" rx="1.3" />
        <rect x="15.5" y="4" width="2.6" height="9" rx="1.3" />
        <rect x="3" y="9.5" width="2.6" height="7.5" rx="1.3" transform="rotate(-35 4.3 13.2)" />
        <rect x="6" y="9" width="12" height="12.5" rx="4.5" />
      </g>
    </svg>
  )
}
