import { useState } from 'react'
import { useNow } from '../hooks/useNow.js'
import { useVisitorName } from '../hooks/useVisitorName.js'
import { MAX_NAME_LENGTH, greetingFor, longToday } from '../utils/greeting.js'
import './Greeting.css'

const PENCIL = 'M4 20h4L19 9l-4-4L4 16v4zm10-14 4 4'

/**
 * Saludo del inicio segun la hora ("Buenas tardes, Guillermo"). El
 * nombre es opcional: se pide con un enlace chico y se guarda en el
 * navegador.
 */
export default function Greeting() {
  const now = useNow(60_000)
  const { name, setName } = useVisitorName()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

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
          {greetingFor(now)}
          {name && `, ${name}`}
          {name ? (
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
        {longToday(now)} · Así está el transporte ahora.
        {name && !editing && <span className="greeting-private"> Tu nombre se guarda solo en este navegador.</span>}
      </p>
    </div>
  )
}
