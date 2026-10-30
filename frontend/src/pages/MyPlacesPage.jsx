import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import Chevrons from '../components/Chevrons.jsx'
import PlaceIcon from '../components/PlaceIcon.jsx'
import StationPicker from '../components/StationPicker.jsx'
import { useApi } from '../hooks/useApi.js'
import { useSavedPlaces } from '../hooks/useSavedPlaces.js'
import { useSession } from '../hooks/useSession.js'
import { buildPlaces } from '../utils/places.js'
import {
  findStationPlace,
  MAX_ADDRESS,
  MAX_NAME,
  MAX_PLACES,
  PLACE_TYPES,
  placePhrase,
  savePlace,
} from '../utils/placesStore.js'
import './AccountPage.css'
import './TripPlannerPage.css'
import './MyPlacesPage.css'

/** "lugar-123" (de buildPlaces) -> 123: la estacion que se guarda. */
const stationIdOf = (option) => Number(String(option.stationId).replace('lugar-', ''))

/** Formulario para agregar o cambiar un lugar. */
function PlaceEditor({ initial, options, onSave, onCancel }) {
  const [name, setName] = useState(initial.tipo === 'otro' && initial.nombre !== 'Lugar' ? (initial.nombre ?? '') : '')
  const [mode, setMode] = useState(initial.direccion ? 'direccion' : 'estacion')
  const [station, setStation] = useState(() => findStationPlace(options, initial.estacion))
  const [address, setAddress] = useState(initial.direccion ?? '')
  const [error, setError] = useState(null)
  const label = initial.tipo === 'otro' ? 'el lugar' : PLACE_TYPES[initial.tipo].label.toLowerCase()

  function submit(event) {
    event.preventDefault()
    if (initial.tipo === 'otro' && !name.trim()) return setError('Ponele un nombre, por ejemplo Facultad o Club.')
    if (mode === 'estacion' && !station) return setError('Elegí una estación de la lista.')
    if (mode === 'direccion' && !address.trim()) return setError('Escribí la dirección, por ejemplo Av. Corrientes 1500.')
    onSave({
      tipo: initial.tipo,
      nombre: name,
      estacion: mode === 'estacion' ? stationIdOf(station) : null,
      direccion: mode === 'direccion' ? address : null,
    })
  }

  return (
    <form className="place-editor" onSubmit={submit} noValidate>
      <div className="place-editor-head">
        <PlaceIcon tipo={initial.tipo} />
        <strong>{initial.tipo === 'otro' ? 'Otro lugar' : PLACE_TYPES[initial.tipo].label}</strong>
      </div>
      {initial.tipo === 'otro' && (
        <label className="auth-field">
          Nombre
          <input
            value={name}
            maxLength={MAX_NAME}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            placeholder="Facultad, Club, Casa de mamá…"
          />
        </label>
      )}
      <div className="image-picker-tabs" role="group" aria-label={`Cómo guardar ${label}`}>
        {[
          ['estacion', 'Estación'],
          ['direccion', 'Dirección'],
        ].map(([key, text]) => (
          <button
            key={key}
            type="button"
            className={mode === key ? 'active' : ''}
            aria-pressed={mode === key}
            onClick={() => {
              setMode(key)
              setError(null)
            }}
          >
            {text}
          </button>
        ))}
      </div>
      {mode === 'estacion' ? (
        <>
          <StationPicker
            id="lugar-estacion"
            title="La estación más cercana (subte, Premetro o tren)"
            stations={options}
            value={station}
            onChange={(s) => {
              setStation(s)
              if (s) setError(null)
            }}
          />
          <small className="place-editor-hint">Con una estación, Cómo llegar te arma el viaje con combinaciones.</small>
        </>
      ) : (
        <>
          <label className="auth-field">
            Dirección
            <input
              value={address}
              maxLength={MAX_ADDRESS}
              onChange={(e) => {
                setAddress(e.target.value)
                setError(null)
              }}
              placeholder="Av. Corrientes 1500"
            />
          </label>
          <small className="place-editor-hint">Con una dirección, el viaje se abre en Google Maps.</small>
        </>
      )}
      {error && (
        <p className="auth-error auth-error-box" role="alert">
          {error}
        </p>
      )}
      <div className="place-editor-actions">
        <button type="submit" className="auth-submit">
          Guardar
        </button>
        <button type="button" className="auth-skip" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

/** Lo que se muestra de un lugar: la estacion (con sus lineas) o la direccion. */
function PlaceDetail({ place, options }) {
  if (place.direccion) {
    return (
      <span className="place-detail">
        <span className="place-detail-text">{place.direccion}</span>
      </span>
    )
  }
  const option = findStationPlace(options, place.estacion)
  if (!option) return <span className="place-detail">Estación guardada</span>
  return (
    <span className="place-detail">
      <span className="place-dots" aria-hidden="true">
        {(option.colors ?? [option.lineColorHex]).map((color, i) => (
          <span key={`${color}-${i}`} style={{ background: color }} />
        ))}
      </span>
      <span className="place-detail-text">
        {option.stationName} · {option.lineName}
      </span>
    </span>
  )
}

/**
 * Mis lugares: Casa, Trabajo y otros lugares frecuentes, para armar el
 * viaje con un toque en Cómo llegar. Funciona sin cuenta; con cuenta se
 * sincronizan en todos los dispositivos.
 */
export default function MyPlacesPage() {
  const { data: stations } = useApi('/api/v1/map/stations')
  const options = useMemo(() => buildPlaces(stations), [stations])
  const { places, save } = useSavedPlaces()
  const session = useSession()
  // null: nada abierto; { index, place }: editando (index null = nuevo).
  const [editing, setEditing] = useState(null)

  const home = places.find((p) => p.tipo === 'casa')
  const work = places.find((p) => p.tipo === 'trabajo')
  const missing = ['casa', 'trabajo'].filter((t) => !places.some((p) => p.tipo === t))
  const full = places.length >= MAX_PLACES
  const commuteLink =
    home?.estacion && work?.estacion
      ? `/como-llegar?desde=${findStationPlace(options, home.estacion)?.stationId}&hasta=${findStationPlace(options, work.estacion)?.stationId}`
      : null

  const editor = (index) =>
    editing && editing.index === index ? (
      <PlaceEditor
        key={`${index}-${editing.place.tipo}`}
        initial={editing.place}
        options={options}
        onCancel={() => setEditing(null)}
        onSave={(place) => {
          save(savePlace(places, place, index))
          setEditing(null)
        }}
      />
    ) : null

  return (
    <div className="wrap content auth">
      <BackButton />
      <section className="auth-card" aria-labelledby="places-title">
        <h1 className="auth-title" id="places-title">
          Mis lugares
        </h1>
        <p className="auth-subtitle">
          Guardá Casa, Trabajo y los lugares a los que vas seguido para armar el viaje con un toque en Cómo llegar.
        </p>

        <ul className="place-list">
          {places.map((place, index) =>
            editing?.index === index ? (
              <li key={index}>{editor(index)}</li>
            ) : (
              <li key={index} className="place-row">
                <PlaceIcon tipo={place.tipo} />
                <div className="place-text">
                  <strong>{place.nombre}</strong>
                  <PlaceDetail place={place} options={options} />
                </div>
                <div className="place-actions">
                  <button type="button" onClick={() => setEditing({ index, place })} disabled={!stations}>
                    Cambiar
                  </button>
                  <button
                    type="button"
                    aria-label={`Quitar ${place.nombre}`}
                    onClick={() => save(places.filter((_, i) => i !== index))}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>

        {editing?.index === null ? (
          editor(null)
        ) : (
          <div className="place-add">
            {missing.map((tipo) => (
              <button
                key={tipo}
                type="button"
                className="place-add-button"
                disabled={!stations || full}
                onClick={() => setEditing({ index: null, place: { tipo } })}
              >
                <PlaceIcon tipo={tipo} />
                Agregar {PLACE_TYPES[tipo].label.toLowerCase()}
              </button>
            ))}
            {!full && (
              <button
                type="button"
                className="place-add-button"
                disabled={!stations}
                onClick={() => setEditing({ index: null, place: { tipo: 'otro' } })}
              >
                <PlaceIcon tipo="otro" />
                Agregar otro lugar
              </button>
            )}
          </div>
        )}

        {commuteLink && (
          <Link className="notif-account-link chevrons-host" to={commuteLink}>
            Ver el viaje {placePhrase(home, 'de').toLowerCase()} {placePhrase(work, 'a')} <Chevrons />
          </Link>
        )}

        <p className="auth-note">
          {session ? (
            'Se guardan en este navegador y en tu cuenta, así los tenés en todos tus dispositivos.'
          ) : (
            <>
              Se guardan en este navegador. <Link to="/ingresar">Entrá con tu cuenta</Link> para tenerlos en todos tus
              dispositivos.
            </>
          )}
        </p>
      </section>
    </div>
  )
}
