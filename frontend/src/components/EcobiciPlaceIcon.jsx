import { placeKind } from '../utils/ecobici.js'
import './EcobiciPlaceIcon.css'

/** Un dibujo por tipo de lugar (trazos de 24x24, como los del sitio). */
const PATHS = {
  plaza:
    'M12 3.5a4.5 4.5 0 0 0-4.3 5.8A3.8 3.8 0 0 0 9 16.5h6a3.8 3.8 0 0 0 1.3-7.2A4.5 4.5 0 0 0 12 3.5zM12 12.5V21M9 21h6',
  universidad: 'M2.5 9 12 4.5 21.5 9 12 13.5zM6.5 11v4.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V11M21.5 9v5',
  congreso: 'M12 3v2.5M8 9.5a4 4 0 0 1 8 0M4 9.5h16M6 9.5V17M10 9.5V17M14 9.5V17M18 9.5V17M3 17h18M3 20.5h18',
  hospital: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM12 8v8M8 12h8',
  iglesia: 'M12 2.5v4M10 4.5h4M7 21v-9l5-4 5 4v9M4 21h16M10.5 21v-3.5a1.5 1.5 0 0 1 3 0V21',
  cultura: 'M3 9 12 4l9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 18h18M2.5 21h19',
  deporte:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4.5 3.8 2.8-1.5 4.4H9.7l-1.5-4.4zM12 3v4.5m3.8 2.8 4.6-1.4m-6.1 5.8 2.8 3.9m-7.4-3.9-2.8 3.9m1.3-8.3-4.6-1.4',
  estacion:
    'M7 3h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM5 10h14M9 20l-2 2m8-2 2 2M8.5 13h.01m7 0h.01',
  bici: 'M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm13 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14.5 9 8h6l3.5 6.5M9 8l3 6.5h-1M14 5h2.5',
}

/** Al lado del nombre de la estacion: que hay ahi (plaza, facultad, Congreso...) o una bici. */
export default function EcobiciPlaceIcon({ name, size = 30 }) {
  return (
    <span className="ecobici-place-icon" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d={PATHS[placeKind(name)]} />
      </svg>
    </span>
  )
}
