import { useEffect, useMemo, useState } from 'react'
import { divIcon } from 'leaflet'
import MapBadge from '../components/MapBadge.jsx'
import { GLYPHS, badgeIcon } from '../utils/mapIcons.js'
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import MapCard, { MapCardIcon } from '../components/MapCard.jsx'
import BackButton from '../components/BackButton.jsx'
import ModeIcon from '../components/ModeIcon.jsx'
import { MOTO_GARAGES, MOTO_STREET, PARKING_SOURCE, PUBLIC_LOTS, PUBLIC_LOTS_SOURCE } from '../data/parking.js'
import { GARAGES, GARAGES_SOURCE } from '../data/garages.js'
import { AMBA_PARTIDOS, OSM_PARKING } from '../data/parkingAmba.js'
import { LOW_COVERAGE, PARKING_LAYERS, coverageByPartido, formatDistance, nearestPlaces, parkingPlaces, parkingTotals, placeDetail } from '../utils/parking.js'
import '../components/MapPopup.css'
import './MapPage.css'
import './ModePage.css'
import './EcobiciPage.css'
import './ParkingPage.css'

const CENTER = [-34.612, -58.43]
const ZOOM = 13
// Distintivo de cada capa: garaje (casa con porton), playa (la P de los
// carteles), cochera para motos (moto bajo techo) y moto en la calle.
const BADGES = {
  car: { glyph: 'garage', bg: '#f4c11b', fg: '#17171a', border: '#17171a', shape: 'circle' },
  lot: { glyph: 'lot', bg: '#f4c11b', fg: '#17171a', border: '#17171a', shape: 'square' },
  garage: { glyph: 'motoGarage', bg: '#17171a', fg: '#f4c11b', border: '#f4c11b', shape: 'square' },
  street: { glyph: 'moto', bg: '#17171a', fg: '#f4c11b', border: '#f4c11b', shape: 'circle' },
  // Conurbano (OpenStreetMap, no oficial): mismo dibujo de playa, en blanco.
  osm: { glyph: 'lot', bg: '#ffffff', fg: '#17171a', border: '#17171a', shape: 'circle' },
}
const SIZES = { car: 22, lot: 26, garage: 24, street: 22, osm: 22 }
// Capas con muchos puntos: con el mapa lejos van como puntos en canvas.
const DOT_STYLE = {
  car: { color: '#17171a', weight: 1, fillColor: '#f4c11b', fillOpacity: 1 },
  osm: { color: '#17171a', weight: 1, fillColor: '#ffffff', fillOpacity: 1 },
}
const iconFor = (layer, active) => badgeIcon(BADGES[layer].glyph, { ...BADGES[layer], size: SIZES[layer], active })

// Los garajes son miles: con el mapa lejos van como puntos (canvas, livianos);
// desde este zoom, con su icono, y solo los que estan a la vista.
const GARAGE_ICON_ZOOM = 15

function ViewTracker({ onChange }) {
  const map = useMapEvents({
    zoomend: () => onChange({ zoom: map.getZoom(), bounds: map.getBounds().pad(0.2) }),
    moveend: () => onChange({ zoom: map.getZoom(), bounds: map.getBounds().pad(0.2) }),
  })
  return null
}

const pointIcon = divIcon({ className: 'parking-here', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] })

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 17), { duration: 0.6 })
  }, [map, target])
  return null
}

/** Tocar el mapa marca el punto desde el que se buscan los lugares mas cercanos. */
function PickPoint({ onPick }) {
  useMapEvents({ click: (event) => onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng, source: 'map' }) })
  return null
}

// Cerca de un punto se buscan lugares hasta este zoom; despues el mapa se acerca al punto.
const POINT_ZOOM = 16

function FlyToPoint({ point }) {
  const map = useMap()
  useEffect(() => {
    if (point?.source === 'gps') map.flyTo([point.latitude, point.longitude], POINT_ZOOM, { duration: 0.6 })
  }, [map, point])
  return null
}

/** Estacionamiento: garajes y playas de la Ciudad, y lugares para motos, en un mapa. */
export default function ParkingPage() {
  const places = useMemo(
    () =>
      parkingPlaces({
        cars: GARAGES,
        lots: PUBLIC_LOTS,
        garages: MOTO_GARAGES,
        street: MOTO_STREET,
        osm: OSM_PARKING,
        partidos: AMBA_PARTIDOS,
      }),
    [],
  )
  const coverage = useMemo(() => coverageByPartido(places, AMBA_PARTIDOS), [places])
  const withoutData = coverage.filter((c) => c.count === 0).map((c) => c.partido)
  const lowData = coverage.filter((c) => c.count > 0 && c.count < LOW_COVERAGE).map((c) => c.partido)
  const totals = useMemo(() => parkingTotals(places), [places])
  const [layer, setLayer] = useState('all')
  const [point, setPoint] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState(null)
  const [view, setView] = useState({ zoom: ZOOM, bounds: null })

  const visible = layer === 'all' ? places : places.filter((p) => p.layer === layer)
  const nearest = nearestPlaces(visible, point)
  const selected = places.find((p) => p.id === selectedId)

  function locate() {
    if (!window.navigator.geolocation) {
      setLocateError('Tu navegador no permite usar la ubicación.')
      return
    }
    setLocating(true)
    setLocateError(null)
    window.navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        setPoint({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, source: 'gps' })
      },
      () => {
        setLocating(false)
        setLocateError('No pudimos obtener tu ubicación. Tocá el mapa para marcar un punto.')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    <div className="wrap content">
      <BackButton />
      <h1 className="page-title page-title-icon">
        <ModeIcon mode="ESTACIONAMIENTO" size="lg" />
        Estacionamiento
      </h1>
      <p className="page-subtitle">
        Garajes y playas de estacionamiento de toda la Ciudad y del conurbano, y para motos, cocheras y lugares en
        la calle del microcentro.
      </p>

      <div className="ecobici-summary">
        <span>
          <strong>{totals.cars.toLocaleString('es-AR')}</strong> garajes
        </span>
        <span>
          <strong>{totals.lots}</strong> playas de la Ciudad
        </span>
        <span>
          <strong>{totals.garages}</strong> cocheras para motos
        </span>
        <span>
          <strong>{totals.streetBlocks}</strong> cuadras con lugar para motos
        </span>
        <span>
          <strong>{totals.osm.toLocaleString('es-AR')}</strong> en el conurbano
        </span>
      </div>

      <div className="parking-toolbar">
        <div className="map-filters" role="group" aria-label="Qué mostrar">
          {[{ key: 'all', label: 'Todos' }, ...PARKING_LAYERS].map((l) => (
            <button
              key={l.key}
              type="button"
              className={l.key === layer ? 'map-filter active' : 'map-filter'}
              aria-pressed={l.key === layer}
              onClick={() => setLayer(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button type="button" className="parking-locate" onClick={locate} disabled={locating}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
          </svg>
          {locating ? 'Buscando tu ubicación…' : 'Cerca de mí'}
        </button>
      </div>
      {locateError && <div className="map-note">{locateError}</div>}
      {!point && !locateError && (
        <div className="map-note">Tocá el mapa o usá “Cerca de mí” para ver los lugares más cercanos.</div>
      )}

      {nearest.length > 0 && (
        <>
          <div className="section-label parking-near-title">
            Más cerca {point.source === 'gps' ? 'de vos' : 'del punto marcado'}
          </div>
          <ul className="ecobici-results">
            {nearest.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={p.id === selectedId ? 'ecobici-result active' : 'ecobici-result'}
                  onClick={() => setSelectedId(p.id)}
                >
                  <MapBadge {...BADGES[p.layer]} className="parking-list-badge" />
                  <span className="ecobici-result-name">
                    {p.title}
                    <small>{placeDetail(p)}</small>
                  </span>
                  <span className="ecobici-counts">{formatDistance(p.meters)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="ecobici-legend" aria-label="Referencias">
        <span>
          <MapBadge {...BADGES.car} />
          Garaje
        </span>
        <span>
          <MapBadge {...BADGES.lot} />
          Playa de la Ciudad
        </span>
        <span>
          <MapBadge {...BADGES.garage} />
          Cochera para motos
        </span>
        <span>
          <MapBadge {...BADGES.street} />
          Motos en la calle
        </span>
        <span>
          <MapBadge {...BADGES.osm} />
          Conurbano (OpenStreetMap)
        </span>
      </div>

      <MapContainer className="ecobici-map parking-map" center={CENTER} zoom={ZOOM} scrollWheelZoom preferCanvas>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <PickPoint onPick={setPoint} />
        <ViewTracker onChange={setView} />
        {point && <Marker position={[point.latitude, point.longitude]} icon={pointIcon} interactive={false} />}
        {visible.map((p) => {
          const active = p.id === selectedId
          const select = { click: () => setSelectedId(p.id) }
          if (p.layer === 'car' || p.layer === 'osm') {
            // Son miles: sin tarjeta propia; se abre una sola, compartida (abajo).
            if (view.zoom >= GARAGE_ICON_ZOOM) {
              if (!active && !view.bounds?.contains([p.lat, p.lon])) return null
              return <Marker key={p.id} position={[p.lat, p.lon]} icon={iconFor(p.layer, active)} eventHandlers={select} />
            }
            return (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lon]}
                radius={active ? 8 : 4}
                pathOptions={DOT_STYLE[p.layer]}
                eventHandlers={select}
              />
            )
          }
          if (p.layer === 'lot') {
            return (
              <Marker key={p.id} position={[p.lat, p.lon]} icon={iconFor('lot', active)} eventHandlers={select}>
                <MapCard
                  badge={<MapCardIcon path={GLYPHS.lot} />}
                  kicker={p.underground ? 'Playa subterránea de la Ciudad' : 'Playa de la Ciudad'}
                  title={p.name}
                  subtitle={p.address !== p.name ? p.address : null}
                >
                  {p.barrio && <div className="station-popup-opened">{p.barrio}</div>}
                </MapCard>
              </Marker>
            )
          }
          if (p.layer === 'garage') {
            return (
              <Marker key={p.id} position={[p.lat, p.lon]} icon={iconFor('garage', active)} eventHandlers={select}>
                <MapCard badge={<MapCardIcon path={GLYPHS.motoGarage} />} kicker="Cochera para motos" title={p.address}>
                  <div className="map-card-stats">
                    <div className="map-card-stat">
                      <strong>{p.capacity}</strong>
                      <span>lugares</span>
                    </div>
                    <div className="map-card-stat">
                      <strong>{p.floors}</strong>
                      <span>{p.floors === 1 ? 'piso' : 'pisos'}</span>
                    </div>
                  </div>
                  <div className="station-popup-route">
                    {p.covered ? 'Bajo techo' : 'A cielo abierto'}
                    {p.exclusive ? ' · exclusiva para motos' : ' · compartida con autos'}
                  </div>
                </MapCard>
              </Marker>
            )
          }
          return (
            <Marker key={p.id} position={[p.lat, p.lon]} icon={iconFor('street', active)} eventHandlers={select}>
              <MapCard badge={<MapCardIcon path={GLYPHS.moto} />} kicker="Motos en la calle" title={p.street} subtitle={placeDetail(p)}>
                {p.barrio && <div className="station-popup-opened">{p.barrio}</div>}
              </MapCard>
            </Marker>
          )
        })}
        {selected?.layer === 'osm' && (
          <MapCard
            key={selected.id}
            position={[selected.lat, selected.lon]}
            onClose={() => setSelectedId(null)}
            badge={<MapCardIcon path={GLYPHS.lot} />}
            kicker="Estacionamiento en el conurbano"
            title={selected.title}
            subtitle={placeDetail(selected) || null}
          >
            <div className="station-popup-opened">Dato de OpenStreetMap (no oficial)</div>
          </MapCard>
        )}
        {selected?.layer === 'car' && (
          <MapCard
            key={selected.id}
            position={[selected.lat, selected.lon]}
            onClose={() => setSelectedId(null)}
            badge={<MapCardIcon path={GLYPHS.garage} />}
            kicker="Garaje"
            title={selected.name || selected.address}
            subtitle={selected.name ? selected.address : null}
          >
            <div className="station-popup-opened">
              {[selected.floors > 1 ? `${selected.floors} pisos` : null, selected.barrio].filter(Boolean).join(' · ')}
            </div>
          </MapCard>
        )}
        <FlyToPoint point={point} />
        <FlyTo target={selected} />
      </MapContainer>

      <section className="panel parking-coverage" aria-label="Cobertura en el conurbano">
        <div className="panel-title">
          Cobertura en el conurbano <span className="count">{coverage.length} partidos</span>
        </div>
        <p className="parking-coverage-note">
          Los municipios no publican datos abiertos de estacionamiento: los lugares del conurbano salen de
          OpenStreetMap, un mapa colaborativo, y en algunos partidos falta mucho.
        </p>
        <ul className="parking-coverage-list">
          {coverage.map((c) => (
            <li key={c.partido} className={c.count < LOW_COVERAGE ? 'low' : undefined}>
              {c.partido} <strong>{c.count}</strong>
            </li>
          ))}
        </ul>
        {(lowData.length > 0 || withoutData.length > 0) && (
          <div className="parking-coverage-legend">
            <i aria-hidden="true" /> Pocos datos: conviene confirmar en el lugar.
          </div>
        )}
      </section>

      <p className="airports-source parking-source">
        Datos del Gobierno de la Ciudad (Buenos Aires Data):{' '}
        <a href={GARAGES_SOURCE.url} target="_blank" rel="noreferrer">Garajes Comerciales</a>,{' '}
        <a href={PUBLIC_LOTS_SOURCE.url} target="_blank" rel="noreferrer">Estacionamientos concesionados</a> y{' '}
        <a href={PARKING_SOURCE.url} target="_blank" rel="noreferrer">Estacionamientos de Motos</a> (este último, solo
        microcentro). Conurbano: ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">colaboradores de OpenStreetMap</a>{' '}
        (ODbL). Conviene confirmar horarios y tarifas en el lugar.
      </p>
    </div>
  )
}
