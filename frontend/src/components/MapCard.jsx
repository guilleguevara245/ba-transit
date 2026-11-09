import { useEffect, useMemo, useRef, useState } from 'react'
import { Popup } from 'react-leaflet'
import './MapPopup.css'

/** Icono de trazo chico para el encabezado de la tarjeta (mismos trazos que ModeIcon). */
export function MapCardIcon({ path }) {
  return (
    <span className="map-card-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d={path} />
      </svg>
    </span>
  )
}

/**
 * Tarjeta de un elemento del mapa con la misma estetica que el popup de
 * las estaciones: encabezado chico (icono y rubro), titulo grande (con
 * un icono opcional al lado, como el de estacion), subtitulo, contenido
 * libre y enlaces al pie.
 */
export default function MapCard({
  badge,
  kicker,
  icon,
  title,
  subtitle,
  children,
  actions,
  minWidth = 220,
  position,
  onClose,
}) {
  // Con position la tarjeta es un popup suelto (uno solo para miles de
  // puntos, como los colectivos en vivo); sin position va dentro de un marcador.
  // react-leaflet vuelve a abrir el popup cada vez que recibe otra position: si se
  // le pasara un arreglo nuevo en cada dibujo, al moverse el mapa se cerraria y se
  // abriria sin parar (y al abrirse corre el mapa, que la vuelve a abrir).
  const lat = position?.[0]
  const lon = position?.[1]
  const fixedPosition = useMemo(() => (lat == null ? undefined : [lat, lon]), [lat, lon])

  // Al abrirse, Leaflet corre el mapa para que la tarjeta entre entera. Despues
  // no: react-leaflet la reacomoda en cada dibujo y cada vez cortaba ese
  // movimiento y empezaba otro (el mapa avanzaba de a un pixel sin terminar),
  // y con los datos en vivo el mapa volvia a la tarjeta aunque se lo hubiera movido.
  const popupRef = useRef(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    // Corre despues de que react-leaflet la acomoda ya dibujada: el mapa ya se corrio para mostrarla.
    if (open && popupRef.current) popupRef.current.options.autoPan = false
  }, [open])
  const eventHandlers = {
    add: () => setOpen(true),
    remove: (event) => {
      // Para la proxima vez que se abra (las de un marcador se abren y se cierran varias veces).
      event.target.options.autoPan = true
      setOpen(false)
      onClose?.()
    },
  }

  return (
    <Popup
      className="station-popup-container"
      maxWidth={300}
      minWidth={minWidth}
      autoPanPadding={[16, 16]}
      position={fixedPosition}
      ref={popupRef}
      eventHandlers={eventHandlers}
    >
      <div className="station-popup">
        <div className="station-popup-line">
          {badge}
          {kicker}
        </div>
        <h3 className="station-popup-name">
          {icon}
          {title}
        </h3>
        {subtitle && <div className="station-popup-route">{subtitle}</div>}
        {children}
        {actions && <div className="station-popup-links">{actions}</div>}
      </div>
    </Popup>
  )
}
