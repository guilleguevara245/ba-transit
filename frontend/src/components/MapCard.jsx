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
  return (
    <Popup
      className="station-popup-container"
      maxWidth={300}
      minWidth={minWidth}
      autoPanPadding={[16, 16]}
      position={position}
      eventHandlers={onClose ? { remove: onClose } : undefined}
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
