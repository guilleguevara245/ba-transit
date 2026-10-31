import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton.jsx'
import Chevrons from '../components/Chevrons.jsx'
import PlaceIcon from '../components/PlaceIcon.jsx'
import AddressField from '../components/AddressField.jsx'
import { useAddressSearch } from '../hooks/useAddressSearch.js'
import { useApi } from '../hooks/useApi.js'
import { useSavedPlaces } from '../hooks/useSavedPlaces.js'
import { useSession } from '../hooks/useSession.js'
import { buildPlaces } from '../utils/places.js'
import { confirmedPlace, nearestStation } from '../utils/addressSearch.js'
import { findStationPlace, MAX_NAME, MAX_PLACES, PLACE_TYPES, placePhrase, savePlace } from '../utils/placesStore.js'
import './AccountPage.css'
import './TripPlannerPage.css'
import './MyPlacesPage.css'

const CHECK_ICON = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-4 9.5 2.7 2.7L16 9.8'
const INFO_ICON = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 8v5m0-8h.01'

/** La estacion mas cercana guardada en un lugar, para mostrarla: { name, km }. */
function nearOf(options, cerca, km = null) {
  const option = findStationPlace(options, cerca)
  return option ? { name: `${option.stationName} (${option.lineName})`, km } : null
}

/**
 * Formulario para agregar o cambiar un lugar: se guarda con la direccion,
 * confirmada con Georef (de la lista de sugerencias).
 */
function PlaceEditor({ initial, options, onSave, onCancel }) {
  const [name, setName] = useState(initial.tipo === 'otro' && initial.nombre !== 'Lugar' ? (initial.nombre ?? '') : '')
  const [address, setAddress] = useState(initial.direccion ?? '')
  // La direccion confirmada: lo que se guarda ({ direccion, lat, lon, cerca }) y la estacion cercana para mostrar.
  const [picked, setPicked] = useState(() =>
    initial.direccion && initial.lat != null
      ? {
          place: { direccion: initial.direccion, lat: initial.lat, lon: initial.lon, cerca: initial.cerca ?? null },
          near: nearOf(options, initial.cerca),
        }
      : null,
  )
  const search = useAddressSearch(address, !picked)
  const [error, setError] = useState(null)
  const oldStation = initial.estacion ? findStationPlace(options, initial.estacion) : null
  const canSaveUnconfirmed = !picked && (search.status === 'empty' || search.status === 'error')

  function save(place) {
    if (initial.tipo === 'otro' && !name.trim()) return setError('Ponele un nombre, por ejemplo Facultad o Club.')
    onSave({ tipo: initial.tipo, nombre: name, estacion: null, ...place })
  }

  function submit(event) {
    event.preventDefault()
    if (picked) return save(picked.place)
    if (!address.trim()) return setError('Escribí la dirección, por ejemplo Av. Corrientes 1500.')
    if (canSaveUnconfirmed) return setError('No pudimos confirmar la dirección. Revisala o guardala sin confirmar.')
    return setError('Elegí tu dirección de la lista para confirmarla.')
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
      {oldStation && (
        <small className="place-editor-hint">
          Antes estaba guardado con la estación {oldStation.stationName}. Ahora los lugares se guardan con la dirección.
        </small>
      )}
      <AddressField
        value={address}
        onChange={(text) => {
          setAddress(text)
          setPicked(null)
          setError(null)
        }}
        search={search}
        picked={picked?.place ?? null}
        near={picked?.near ?? null}
        onPick={(found) => {
          const place = confirmedPlace(found, options)
          const best = nearestStation(options, found)
          setAddress(place.direccion)
          setPicked({ place, near: best ? nearOf(options, place.cerca, best.km) : null })
          setError(null)
        }}
      />
      <small className="place-editor-hint">
        Solo guardamos la dirección, la zona (a unos 5 km) y la estación más cercana, para armarte el viaje.
      </small>
      {error && (
        <p className="auth-error auth-error-box" role="alert">
          {error}
        </p>
      )}
      <div className="place-editor-actions">
        <button type="submit" className="auth-submit">
          Guardar
        </button>
        {canSaveUnconfirmed && address.trim() && (
          <button type="button" className="auth-skip" onClick={() => save({ direccion: address })}>
            Guardar sin confirmar
          </button>
        )}
        <button type="button" className="auth-skip" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

/**
 * Lo que se muestra de un lugar: la direccion (confirmada, con la estacion
 * mas cercana, o sin confirmar) o, en los guardados antes, la estacion.
 */
function PlaceDetail({ place, options }) {
  if (place.direccion) {
    const near = findStationPlace(options, place.cerca)
    const confirmed = place.lat != null
    return (
      <>
        <span className="place-detail">
          <span className="place-detail-text">{place.direccion}</span>
        </span>
        <span className={`place-check ${confirmed ? 'place-check-ok' : 'place-check-no'}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={confirmed ? CHECK_ICON : INFO_ICON} />
          </svg>
          {confirmed
            ? near
              ? `Confirmada · cerca de ${near.stationName}`
              : 'Confirmada'
            : 'Sin confirmar'}
        </span>
      </>
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
  // Con estacion (la guardada o la mas cercana a la direccion confirmada), el viaje se arma en Cómo llegar.
  const homeStation = home && findStationPlace(options, home.estacion ?? home.cerca)
  const workStation = work && findStationPlace(options, work.estacion ?? work.cerca)
  const commuteLink =
    homeStation && workStation ? `/como-llegar?desde=${homeStation.stationId}&hasta=${workStation.stationId}` : null

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
                    {place.direccion && place.lat == null ? 'Confirmar' : 'Cambiar'}
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
